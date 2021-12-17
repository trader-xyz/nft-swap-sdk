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
} from './pure';
import {
  EIP712_TYPES,
  EipDomain,
  getEipDomain,
  SupportedTokenTypes,
  TypedData,
} from '../utils/order';
import { UnexpectedAssetTypeError } from './error';
import type {
  BaseProvider,
  JsonRpcSigner,
  TransactionReceipt,
} from '@ethersproject/providers';
import type { ContractTransaction } from '@ethersproject/contracts';
import type { InterallySupportedAssetFormat } from './pure';
import type {
  UserFacingERC1155AssetDataSerializedNormalizedSingle,
  UserFacingERC20AssetDataSerialized,
  UserFacingERC721AssetDataSerialized,
} from '../utils/order';
import { normalizeOrder as _normalizeOrder } from '../utils/order';
import { AssetProxyId, Order, SignedOrder } from './types';
import { Signer, TypedDataSigner } from '@ethersproject/abstract-signer';
import { ExchangeContract, ExchangeContract__factory } from '../contracts';
import {
  convertAssetsToInternalFormat,
  convertAssetToInternalFormat,
  SwappableAsset,
} from '../utils/asset-data';

interface NftSwapConfig {
  exchangeContractAddress?: string;
  erc20ProxyContractAddress?: string;
  erc721ProxyContractAddress?: string;
  erc1155ProxyContractAddress?: string;
}

interface INftSwap {
  signOrder: (
    order: Order,
    signerAddress: string,
    signer: Signer
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
  getOrderHash: (order: any) => any;
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
    signerOverride?: Signer
  ) => {
    const signerToUser = signerOverride ?? this.signer;
    if (!signerToUser) {
      throw new Error('signOrder:Signer undefined');
    }
    return _signOrder(
      order,
      addressOfWalletSigningOrder,
      signerToUser as any,
      this.chainId,
      this.exchangeContract.address
    );
  };

  public signOrderWithHash = async () => {};

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
    return _getApprovalStatus(
      walletAddress,
      exchangeProxyAddressForAsset,
      convertAssetToInternalFormat(asset),
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

  public getOrderHash = async (order: Order) => {
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
    const tx = await _sendSignedOrderToEthereum(
      signedOrder,
      fillOverrides?.exchangeContract ?? this.exchangeContract,
      transactionOverrides
    );
    return tx;
  };

  public normalizeOrder = (order: Order) => {
    const normalizedOrder = _normalizeOrder(order);
    return normalizedOrder as Order;
  };

  public normalizeSignedOrder = (order: SignedOrder) => {
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
