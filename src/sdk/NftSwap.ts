import type {
  BaseProvider,
  TransactionReceipt,
} from '@ethersproject/providers';
import type { ContractTransaction } from '@ethersproject/contracts';
import type { Signer } from '@ethersproject/abstract-signer';

import addresses from '../addresses.json';
import {
  buildOrder as _buildOrder,
  signOrder as _signOrder,
  sendSignedOrderToEthereum as _sendSignedOrderToEthereum,
  approveAsset as _approveAsset,
  verifyOrderSignature as _verifyOrderSignature,
  getApprovalStatus as _getApprovalStatus,
  cancelOrder as _cancelOrder,
  cancelOrders as _cancelOrders,
  cancelOrdersUpToNow as _cancelOrdersUpToNow,
  getOrderInfo as _getOrderInfo,
  getProxyAddressForErcType,
  hashOrder,
  TransactionOverrides,
  PayableOverrides,
  ApprovalStatus,
  SigningOptions,
  getForwarderAddress,
} from './pure';
import {
  getEipDomain,
  normalizeOrder as _normalizeOrder,
} from '../utils/order';
import {
  ChainId,
  EIP712_TYPES,
  Order,
  OrderInfo,
  OrderStatus,
  OrderStatusCodeLookup,
  SignedOrder,
  SupportedTokenTypes,
  SwappableAsset,
  TypedData,
} from './types';
import { ExchangeContract, ExchangeContract__factory } from '../contracts';
import {
  convertAssetsToInternalFormat,
  convertAssetToInternalFormat,
} from '../utils/asset-data';
import { sleep } from '../utils/sleep';

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
  cancelOrder: (order: Order) => Promise<ContractTransaction>;
  waitUntilOrderFilledOrCancelled: (
    order: Order,
    timeoutInMs: number,
    throwIfStatusOtherThanFillableOrFilled?: boolean
  ) => Promise<OrderInfo | null>;
  getOrderStatus: (order: Order) => Promise<OrderStatus>;
  getOrderInfo: (order: Order) => Promise<OrderInfo>;
  getOrderHash: (order: Order) => string;
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
 * NftSwap Convenience class to swap between ERC20, ERC721, and ERC1155. Primary entrypoint for swapping.
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
  }

  public cancelOrder = async (order: Order) => {
    return _cancelOrder(this.exchangeContract, order);
  };

  /**
   *
   * @param order : 0x Order;
   * @param timeoutInMs : Timeout in millisecond to give up listening for order fill
   * @param throwIfStatusOtherThanFillableOrFilled : Option to throw if status changes from fillable to anything other than 'filled' (e.g 'cancelled')
   * @returns OrderInfo if status change in order, or null if timed out
   */
  public waitUntilOrderFilledOrCancelled = async (
    order: Order,
    timeoutInMs: number = 60 * 1000,
    throwIfStatusOtherThanFillableOrFilled: boolean = false
  ): Promise<OrderInfo | null> => {
    let settled = false;

    const timeoutPromise = sleep(timeoutInMs).then((_) => null);

    const orderStatusRefreshPromiseFn = async (): Promise<OrderInfo | null> => {
      while (!settled) {
        const orderInfo = await this.getOrderInfo(order);
        if (orderInfo.orderStatus === OrderStatus.Fillable) {
          await sleep(10_000);
          continue;
        } else if (orderInfo.orderStatus === OrderStatus.FullyFilled) {
          return orderInfo;
        } else {
          // expired, bad order, etc
          if (throwIfStatusOtherThanFillableOrFilled) {
            throw new Error(
              OrderStatusCodeLookup[orderInfo.orderStatus] ??
                orderInfo.orderStatus ??
                'Unknown status'
            );
          }
          return orderInfo;
        }
      }
      return null;
    };
    const fillEventListenerFn = async () => {
      // TODO(johnrjj)
      await sleep(120_000);
      return null;
    };

    const orderStatusRefreshPromiseLoop: Promise<OrderInfo | null> =
      orderStatusRefreshPromiseFn();

    const fillEventPromise: Promise<OrderInfo | null> = fillEventListenerFn();

    const orderInfo = await Promise.any([
      timeoutPromise,
      orderStatusRefreshPromiseLoop,
      fillEventPromise,
    ]);
    settled = true;

    return orderInfo;
  };

  public getOrderInfo = async (order: Order): Promise<OrderInfo> => {
    return _getOrderInfo(this.exchangeContract, order);
  };

  public getOrderStatus = async (order: Order): Promise<OrderStatus> => {
    const orderInfo = await this.getOrderInfo(order);
    return orderInfo.orderStatus;
  };

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
