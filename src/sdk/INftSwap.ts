import type { TransactionReceipt } from '@ethersproject/providers';
import type { ContractTransaction } from '@ethersproject/contracts';
import type { Signer } from '@ethersproject/abstract-signer';
import {
  buildOrder as _buildOrder,
  signOrder as _signOrder,
  fillSignedOrder as _fillSignedOrder,
  approveAsset as _approveAsset,
  verifyOrderSignature as _verifyOrderSignature,
  getApprovalStatus as _getApprovalStatus,
  cancelOrder as _cancelOrder,
  cancelOrders as _cancelOrders,
  estimateGasForFillOrder as _estimateGasForFillOrder,
  estimateGasForApproval as _estimateGasForApproval,
  cancelOrdersUpToNow as _cancelOrdersUpToNow,
  getOrderInfo as _getOrderInfo,
  getAssetsFromOrder as _getAssetsFromOrder,
  TransactionOverrides,
  ApprovalStatus,
  SigningOptions,
} from './v3/pure';
import { normalizeOrder as _normalizeOrder } from '../utils/order';
import {
  Order,
  OrderInfo,
  OrderStatus,
  SignedOrder,
  SwappableAsset,
  TypedData,
} from './v3/types';
import { ExchangeContract } from '../contracts';

export interface NftSwapConfig {
  exchangeContractAddress?: string;
  erc20ProxyContractAddress?: string;
  erc721ProxyContractAddress?: string;
  erc1155ProxyContractAddress?: string;
  forwarderContractAddress?: string;
  wrappedNativeTokenContractAddress?: string;
  gasBufferMultiples?: { [chainId: number]: number };
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
    timeoutInMs?: number,
    pollOrderStatusFrequencyInMs?: number,
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
  checkIfOrderCanBeFilledWithNativeToken: (order: Order) => boolean;
  getAssetsFromOrder: (order: Order) => {
    makerAssets: SwappableAsset[];
    takerAssets: SwappableAsset[];
  };
}

/**
 * All optional
 */
export interface BuildOrderAdditionalConfig {
  /**
   * If not specified, will be fillable by anyone
   */
  takerAddress?: string;
  /**
   * Date type or unix timestamp when order expires
   */
  expiration?: Date | number;
  /**
   * Unique salt for order, defaults to a unix timestamp
   */
  salt?: string;
  exchangeAddress?: string;
  chainId?: number;
  feeRecipientAddress?: string;
  makerFeeAssetData?: string;
  takerFeeAssetData?: string;
  makerFee?: string;
  takerFee?: string;
}

export interface ApprovalOverrides {
  signer: Signer;
  approve: boolean;
  exchangeProxyContractAddressForAsset: string;
  chainId: number;
  gasAmountBufferMultiple: number | null;
}

export interface FillOrderOverrides {
  signer: Signer;
  exchangeContract: ExchangeContract;
  /**
   * Fill order with native token if possible
   * e.g. If taker asset is WETH, allows order to be filled with ETH
   */
  fillOrderWithNativeTokenInsteadOfWrappedToken: boolean;
  gasAmountBufferMultiple: number | null;
}
