import type { TransactionReceipt } from '@ethersproject/providers';
import type { ContractTransaction } from '@ethersproject/contracts';
import type { Signer } from '@ethersproject/abstract-signer';
import type {
  Order,
  OrderInfoV3,
  OrderStatusV3,
  SignedOrder,
  SigningOptionsV3,
  SwappableAsset,
  TypedData,
} from './types';
import type { ExchangeContract } from '../../contracts';
import type {
  ApprovalStatus,
  BaseNftSwap,
  PayableOverrides,
  TransactionOverrides,
} from '../common/types';

export interface NftSwapConfig {
  exchangeContractAddress?: string;
  erc20ProxyContractAddress?: string;
  erc721ProxyContractAddress?: string;
  erc1155ProxyContractAddress?: string;
  forwarderContractAddress?: string;
  wrappedNativeTokenContractAddress?: string;
  gasBufferMultiples?: { [chainId: number]: number };
}

export interface INftSwapV3 extends BaseNftSwap {
  signOrder: (
    order: Order,
    signerAddress: string,
    signer: Signer,
    signingOptions?: Partial<SigningOptionsV3>
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
    fillOrderOverrides?: Partial<FillOrderOverrides>,
    transactionOverrides?: Partial<PayableOverrides>
  ) => Promise<ContractTransaction>;
  awaitTransactionHash: (txHash: string) => Promise<TransactionReceipt>;
  cancelOrder: (order: Order) => Promise<ContractTransaction>;
  waitUntilOrderFilledOrCancelled: (
    order: Order,
    timeoutInMs?: number,
    pollOrderStatusFrequencyInMs?: number,
    throwIfStatusOtherThanFillableOrFilled?: boolean
  ) => Promise<OrderInfoV3 | null>;
  getOrderStatus: (order: Order) => Promise<OrderStatusV3>;
  getOrderInfo: (order: Order) => Promise<OrderInfoV3>;
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
