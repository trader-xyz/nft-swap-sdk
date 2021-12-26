import addresses from '../addresses.json';
import { ChainId } from '../utils/eth';
import {
  buildOrder as _buildOrder,
  signOrder as _signOrder,
  sendSignedOrderToEthereum as _sendSignedOrderToEthereum,
  approveAsset as _approveAsset,
  verifyOrderSignature as _verifyOrderSignature,
  getApprovalStatus as _getApprovalStatus,
  ApprovalStatus,
  getProxyAddressForErcType,
  TransactionOverrides,
  PayableOverrides,
  hashOrder,
  SigningOptions,
  getForwarderAddress,
} from './pure';
import {
  EIP712_TYPES,
  getEipDomain,
  SupportedTokenTypes,
  TypedData,
} from '../utils/order';
import type {
  BaseProvider,
  TransactionReceipt,
} from '@ethersproject/providers';
import type { ContractTransaction } from '@ethersproject/contracts';
import { normalizeOrder as _normalizeOrder } from '../utils/order';
import { Order, SignedOrder } from './types';
import { Signer } from '@ethersproject/abstract-signer';
import { ExchangeContract, ExchangeContract__factory } from '../contracts';
import {
  convertAssetsToInternalFormat,
  convertAssetToInternalFormat,
  SwappableAsset,
} from '../utils/asset-data';

export interface NftSwapConfig {
  exchangeContractAddress?: string;
  erc20ProxyContractAddress?: string;
  erc721ProxyContractAddress?: string;
  erc1155ProxyContractAddress?: string;
  forwarderContractAddress?: string;
}

export interface INftSwap {
  signOrder: (
    order: Order,
    signerAddress: string,
    signer: Signer,
    signingOptions?: Partial<SigningOptions>
  ) => Promise<SignedOrder>;
  buildOrder: (
    makerAssets: Array<SwappableAsset>,
    takerAssets: Array<SwappableAsset>,
    makerAddress: string,
    orderConfig?: Partial<BuildOrderAdditionalConfig>
  ) => Order;
  loadApprovalStatus: (
    asset: SwappableAsset,
    walletAddress: string,
    approvalOverrides?: Partial<ApprovalOverrides>
  ) => Promise<ApprovalStatus>;
  approveTokenOrNftByAsset: (
    asset: SwappableAsset,
    walletAddress: string,
    approvalTransactionOverrides?: Partial<TransactionOverrides>,
    approvalOverrides?: Partial<ApprovalOverrides>
  ) => Promise<ContractTransaction>;
  fillSignedOrder: (
    signedOrder: SignedOrder,
    fillOrderOverrides?: Partial<FillOrderOverrides>
  ) => Promise<ContractTransaction>;
  awaitTransactionHash: (txHash: string) => Promise<TransactionReceipt>;
  getOrderHash: (order: any) => string;
  getTypedData: (
    chainId: number,
    exchangeContractAddress: string,
    order: Order
  ) => TypedData;
  normalizeSignedOrder: (order: SignedOrder) => SignedOrder;
  normalizeOrder: (order: Order) => Order;
  verifyOrderSignature: (
    order: Order,
    signature: string,
    chainId: number,
    exchangeContractAddress: string
  ) => boolean;
}

/**
 * All optional
 */
export interface BuildOrderAdditionalConfig {
  chainId?: number;
  takerAddress?: string;
  expiration?: Date;
  exchangeAddress?: string;
  salt?: string;
}

export interface ApprovalOverrides {
  signer: Signer;
  approve: boolean;
  exchangeProxyContractAddressForAsset: string;
  chainId: number;
}

export interface FillOrderOverrides {
  signer: Signer;
  exchangeContract: ExchangeContract;
}

/**
 * Convenience wrapper to swap between ERC20,ERC721,and ERC1155
 */
class NftSwap implements INftSwap {
  public provider: BaseProvider;
  public signer: Signer | undefined;
  public chainId: number;
  public exchangeContract: ExchangeContract;
  public exchangeContractAddress: string;
  public erc20ProxyContractAddress: string;
  public erc720ProxyContractAddress: string;
  public erc1155ProxyContractAddress: string;
  public forwarderContractAddress: string | null;

  constructor(
    provider: BaseProvider,
    signer: Signer,
    chainId: ChainId,
    additionalConfig?: NftSwapConfig
  ) {
    this.provider = provider;
    this.signer = signer;
    this.chainId = chainId;

    const zeroExExchangeContractAddress =
      additionalConfig?.exchangeContractAddress ?? addresses[chainId]?.exchange;

    if (!zeroExExchangeContractAddress) {
      throw new Error(
        `Chain ${chainId} missing ExchangeContract address. Supply one manually via the additionalConfig argument`
      );
    }

    this.exchangeContractAddress = zeroExExchangeContractAddress;

    this.erc20ProxyContractAddress =
      additionalConfig?.erc20ProxyContractAddress ??
      getProxyAddressForErcType(SupportedTokenTypes.ERC20, chainId);
    this.erc720ProxyContractAddress =
      additionalConfig?.erc721ProxyContractAddress ??
      getProxyAddressForErcType(SupportedTokenTypes.ERC721, chainId);
    this.erc1155ProxyContractAddress =
      additionalConfig?.erc1155ProxyContractAddress ??
      getProxyAddressForErcType(SupportedTokenTypes.ERC1155, chainId);
    this.forwarderContractAddress =
      additionalConfig?.forwarderContractAddress ??
      getForwarderAddress(chainId) ??
      null;

    // Initialize Exchange contract so we can interact with it easily.
    this.exchangeContract = ExchangeContract__factory.connect(
      zeroExExchangeContractAddress,
      provider
    );

    this.exchangeContract = ExchangeContract__factory.connect(
      zeroExExchangeContractAddress,
      signer
    );
  }

  public awaitTransactionHash = async (txHash: string) => {
    return this.provider.waitForTransaction(txHash);
  };

  public signOrder = async (
    order: Order,
    addressOfWalletSigningOrder: string,
    signerOverride?: Signer,
    signingOptions?: Partial<SigningOptions>
  ) => {
    const signerToUser = signerOverride ?? this.signer;
    if (!signerToUser) {
      throw new Error('signOrder:Signer undefined');
    }
    return _signOrder(
      order,
      addressOfWalletSigningOrder,
      signerToUser,
      this.provider,
      this.chainId,
      this.exchangeContract.address,
      signingOptions
    );
  };

  public buildOrder = (
    makerAssets: SwappableAsset[],
    takerAssets: SwappableAsset[],
    makerAddress: string,
    userConfig?: Partial<BuildOrderAdditionalConfig>
  ) => {
    const defaultConfig = { chainId: this.chainId, makerAddress: makerAddress };
    const config = { ...defaultConfig, ...userConfig };
    return _buildOrder(
      convertAssetsToInternalFormat(makerAssets),
      convertAssetsToInternalFormat(takerAssets),
      config
    );
  };

  public loadApprovalStatus = async (
    asset: SwappableAsset,
    walletAddress: string
  ) => {
    // TODO(johnrjj) - Fix this...
    const exchangeProxyAddressForAsset = getProxyAddressForErcType(
      asset.type as SupportedTokenTypes,
      this.chainId
    );
    const assetInternalFmt = convertAssetToInternalFormat(asset);
    return _getApprovalStatus(
      walletAddress,
      exchangeProxyAddressForAsset,
      assetInternalFmt,
      this.provider
    );
  };

  /**
   * Convenience wrapper around internal approveTokenOrNft
   * @param asset Asset in the SDK format
   * @returns
   */
  public async approveTokenOrNftByAsset(
    asset: SwappableAsset,
    walletAddress: string,
    approvalTransactionOverrides?: Partial<TransactionOverrides>,
    otherOverrides?: Partial<ApprovalOverrides>
  ) {
    // TODO(johnrjj) - Look up via class fields instead...
    const exchangeProxyAddressForAsset = getProxyAddressForErcType(
      asset.type as SupportedTokenTypes,
      this.chainId
    );
    const signerToUse = otherOverrides?.signer ?? this.signer;
    if (!signerToUse) {
      throw new Error('approveTokenOrNftByAsset:Signer null');
    }
    return _approveAsset(
      walletAddress,
      otherOverrides?.exchangeProxyContractAddressForAsset ??
        exchangeProxyAddressForAsset,
      convertAssetToInternalFormat(asset),
      signerToUse,
      approvalTransactionOverrides ?? {},
      otherOverrides?.approve ?? true
    );
  }

  public getOrderHash = (order: Order) => {
    return hashOrder(order, this.chainId, this.exchangeContract.address);
  };

  public getTypedData = (
    chainId: number,
    exchangeContractAddress: string,
    order: Order
  ) => {
    const domain = getEipDomain(chainId, exchangeContractAddress);
    const types = EIP712_TYPES;
    const value = order;
    return {
      domain,
      types,
      value,
    };
  };

  public fillSignedOrder = async (
    signedOrder: SignedOrder,
    fillOverrides?: Partial<FillOrderOverrides>,
    transactionOverrides: Partial<PayableOverrides> = {}
  ) => {
    return _sendSignedOrderToEthereum(
      signedOrder,
      fillOverrides?.exchangeContract ?? this.exchangeContract,
      transactionOverrides
    );
  };

  public normalizeOrder = (order: Order): Order => {
    const normalizedOrder = _normalizeOrder(order);
    return normalizedOrder as Order;
  };

  public normalizeSignedOrder = (order: SignedOrder): SignedOrder => {
    const normalizedOrder = _normalizeOrder(order);
    return normalizedOrder as SignedOrder;
  };

  public verifyOrderSignature = (
    order: Order,
    signature: string,
    chainId: number,
    exchangeContractAddress: string
  ) => {
    return _verifyOrderSignature(
      order,
      signature,
      chainId,
      exchangeContractAddress
    );
  };
}

export { NftSwap };
