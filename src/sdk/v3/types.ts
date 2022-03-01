import type { BigNumber } from '@ethersproject/bignumber';
import type { Bytes } from '@ethersproject/bytes';

export type BigNumberish = BigNumber | Bytes | bigint | string | number;

export interface AddressesForChainV3 {
  exchange: string;
  erc20Proxy: string;
  erc721Proxy: string;
  multiAssetProxy: string;
  erc1155Proxy: string;
  forwarder: string;
  wrappedNativeToken?: string | null;
}

export type ContractAddresses = {
  [chainId: string]: AddressesForChainV3;
};

export interface Order {
  makerAddress: string;
  takerAddress: string;
  feeRecipientAddress: string;
  senderAddress: string;
  makerAssetAmount: string;
  takerAssetAmount: string;
  makerFee: string;
  takerFee: string;
  expirationTimeSeconds: string;
  salt: string;
  makerAssetData: string;
  takerAssetData: string;
  makerFeeAssetData: string;
  takerFeeAssetData: string;
  signature?: string;
}

export interface SignedOrder extends Order {
  signature: string;
}

export declare enum SignatureType {
  Illegal = 0,
  Invalid = 1,
  EIP712 = 2,
  EthSign = 3,
  Wallet = 4,
  Validator = 5,
  PreSigned = 6,
  EIP1271Wallet = 7,
  NSignatureTypes = 8,
}

export enum AssetProxyId {
  ERC20 = '0xf47261b0',
  ERC721 = '0x02571792',
  MultiAsset = '0x94cfcdd7',
  ERC1155 = '0xa7cb5fb7',
  StaticCall = '0xc339d10a',
  ERC20Bridge = '0xdc1600f3',
}

export enum SupportedChainIdsV3 {
  Mainnet = 1,
  Ropsten = 3,
  Rinkeby = 4,
  Kovan = 42,
  Ganache = 1337,
  BSC = 56,
  Polygon = 137,
  PolygonMumbai = 80001,
  Avalanche = 43114,
}

export interface OrderInfoV3 {
  orderStatus: OrderStatusV3;
  orderHash: string;
  orderTakerAssetFilledAmount: BigNumber;
}

export enum OrderStatusV3 {
  Invalid = 0,
  InvalidMakerAssetAmount,
  InvalidTakerAssetAmount,
  Fillable,
  Expired,
  FullyFilled,
  Cancelled,
}

export const OrderStatusCodeLookup = {
  0: 'Invalid',
  1: 'InvalidMakerAssetAmount',
  2: 'InvalidTakerAssetAmount',
  3: 'Fillable',
  4: 'Expired',
  5: 'FullyFilled',
  6: 'Cancelled',
};

export interface ERC20AssetData {
  assetProxyId: string;
  tokenAddress: string;
}

export interface ERC20BridgeAssetData {
  assetProxyId: string;
  tokenAddress: string;
  bridgeAddress: string;
  bridgeData: string;
}

export interface ERC721AssetData {
  assetProxyId: string;
  tokenAddress: string;
  tokenId: BigNumber;
}

export interface ERC1155AssetData {
  assetProxyId: string;
  tokenAddress: string;
  tokenIds: BigNumber[];
  tokenValues: BigNumber[];
  callbackData: string;
}

export interface StaticCallAssetData {
  assetProxyId: string;
  callTarget: string;
  staticCallData: string;
  callResultHash: string;
}

export interface ERC1155AssetDataNoProxyId {
  tokenAddress: string;
  tokenValues: BigNumber[];
  tokenIds: BigNumber[];
  callbackData: string;
}

export declare type SingleAssetData =
  | ERC20AssetData
  | ERC20BridgeAssetData
  | ERC721AssetData
  | ERC1155AssetData
  | StaticCallAssetData;

export interface MultiAssetData {
  assetProxyId: string;
  amounts: BigNumber[];
  nestedAssetData: string[];
}

export interface MultiAssetDataWithRecursiveDecoding {
  assetProxyId: string;
  amounts: BigNumber[];
  nestedAssetData: SingleAssetData[];
}

export interface MultiAssetDataWithRecursiveDecoding {
  assetProxyId: string;
  amounts: BigNumber[];
  nestedAssetData: SingleAssetData[];
}

export interface DutchAuctionData {
  assetData: AssetData;
  beginTimeSeconds: BigNumber;
  beginAmount: BigNumber;
}

export declare type AssetData =
  | SingleAssetData
  | MultiAssetData
  | MultiAssetDataWithRecursiveDecoding;

export type AvailableSingleAssetDataTypes =
  | ERC20AssetData
  | ERC721AssetData
  | ERC1155AssetData;

export type AvailableAssetDataTypes =
  | AvailableSingleAssetDataTypes
  | MultiAssetData;

export interface MultiAssetDataSerialized {
  assetProxyId: string;
  amounts: string[];
  nestedAssetData: string[];
}

// User facing
export interface UserFacingERC20AssetDataSerialized {
  tokenAddress: string;
  type: 'ERC20';
  amount: string;
}

export interface UserFacingERC721AssetDataSerialized {
  tokenAddress: string;
  tokenId: string;
  type: 'ERC721';
}

export interface UserFacingERC1155AssetDataSerialized {
  tokenAddress: string;
  tokens: Array<{ tokenId: string; tokenValue: string }>;
  type: 'ERC1155';
}

/**
 * Mimic the erc721 duck type
 */
export interface UserFacingERC1155AssetDataSerializedNormalizedSingle {
  tokenAddress: string;
  tokenId: string;
  type: 'ERC1155';
  amount?: string; // Will default to '1'
}

export type UserFacingSerializedSingleAssetDataTypes =
  | UserFacingERC20AssetDataSerialized
  | UserFacingERC721AssetDataSerialized
  | UserFacingERC1155AssetDataSerialized;

export interface ERC20AssetDataSerialized {
  assetProxyId: string;
  tokenAddress: string;
}

export interface ERC721AssetDataSerialized {
  assetProxyId: string;
  tokenAddress: string;
  tokenId: string;
}
export interface ERC1155AssetDataSerialized {
  assetProxyId: string;
  tokenAddress: string;
  tokenIds: string[];
  tokenValues: string[];
  callbackData: string;
}

export type SerializedSingleAssetDataTypes =
  | ERC20AssetDataSerialized
  | ERC721AssetDataSerialized
  | ERC1155AssetDataSerialized;

export type SerializedAvailableAssetDataTypes =
  | SerializedSingleAssetDataTypes
  | MultiAssetDataSerialized;

export interface MultiAssetDataSerializedRecursivelyDecoded {
  assetProxyId: string;
  amounts: string[];
  nestedAssetData: SerializedSingleAssetDataTypes[];
}

export type SerializedAvailableAssetDataTypesDecoded =
  | SerializedSingleAssetDataTypes
  | MultiAssetDataSerializedRecursivelyDecoded;

export enum ORDER_BUILDER_ERROR_CODES {
  MISSING_CONTRACT_WRAPPERS_ERROR = 'MISSING_CONTRACT_WRAPPERS_ERROR',
}

export enum SupportedTokenTypes {
  ERC20 = 'ERC20',
  ERC721 = 'ERC721',
  ERC1155 = 'ERC1155',
}

export type SupportedTokenTypesType =
  | SupportedTokenTypes.ERC20
  | SupportedTokenTypes.ERC721
  | SupportedTokenTypes.ERC1155;

export interface TradeableAssetItem<TMetadata = any> {
  amount: string;
  userInputtedAmount?: string;
  assetData: SerializedSingleAssetDataTypes;
  type: SupportedTokenTypesType;
  id: string; // unique id
  metadata?: TMetadata;
}

// Convenience type wrappers
export interface Erc20TradeableAsset extends TradeableAssetItem {
  assetData: ERC20AssetDataSerialized;
  type: SupportedTokenTypes.ERC20;
}

export interface Erc721TradeableAsset extends TradeableAssetItem {
  assetData: ERC721AssetDataSerialized;
  type: SupportedTokenTypes.ERC721;
}

export interface Erc1155TradeableAsset extends TradeableAssetItem {
  assetData: ERC1155AssetDataSerialized;
  type: SupportedTokenTypes.ERC1155;
}

export type AvailableTradeableAssets =
  | Erc20TradeableAsset
  | Erc721TradeableAsset
  | Erc1155TradeableAsset;

export interface AdditionalOrderConfig {
  makerAddress: string; // only field required
  chainId?: number;
  takerAddress?: string;
  expiration?: Date | number;
  exchangeAddress?: string;
  salt?: string;
  feeRecipientAddress?: string;
  makerFeeAssetData?: string;
  takerFeeAssetData?: string;
  makerFee?: string;
}

export interface ZeroExOrder {
  makerAddress: string;
  takerAddress: string;
  feeRecipientAddress: string;
  senderAddress: string;
  makerAssetAmount: string;
  takerAssetAmount: string;
  makerFee: string;
  takerFee: string;
  expirationTimeSeconds: string;
  salt: string;
  makerAssetData: string;
  takerAssetData: string;
  makerFeeAssetData: string;
  takerFeeAssetData: string;
}

export interface ZeroExSignedOrder extends ZeroExOrder {
  signature: string;
}

export interface EipDomain {
  name: string;
  version: string;
  chainId: string;
  verifyingContract: string;
}

export interface TypedData {
  domain: EipDomain;
  types: {
    Order: {
      name: string;
      type: string;
    }[];
  };
  value: Order;
}

export const EIP712_TYPES = {
  Order: [
    { name: 'makerAddress', type: 'address' },
    { name: 'takerAddress', type: 'address' },
    { name: 'feeRecipientAddress', type: 'address' },
    { name: 'senderAddress', type: 'address' },
    { name: 'makerAssetAmount', type: 'uint256' },
    { name: 'takerAssetAmount', type: 'uint256' },
    { name: 'makerFee', type: 'uint256' },
    { name: 'takerFee', type: 'uint256' },
    { name: 'expirationTimeSeconds', type: 'uint256' },
    { name: 'salt', type: 'uint256' },
    { name: 'makerAssetData', type: 'bytes' },
    { name: 'takerAssetData', type: 'bytes' },
    { name: 'makerFeeAssetData', type: 'bytes' },
    { name: 'takerFeeAssetData', type: 'bytes' },
  ],
};

export type SwappableAsset =
  | UserFacingERC20AssetDataSerialized
  | UserFacingERC721AssetDataSerialized
  | UserFacingERC1155AssetDataSerializedNormalizedSingle;

export enum RevertReason {
  OrderUnfillable = 'ORDER_UNFILLABLE',
  InvalidMaker = 'INVALID_MAKER',
  InvalidTaker = 'INVALID_TAKER',
  InvalidSender = 'INVALID_SENDER',
  InvalidOrderSignature = 'INVALID_ORDER_SIGNATURE',
  InvalidTakerAmount = 'INVALID_TAKER_AMOUNT',
  DivisionByZero = 'DIVISION_BY_ZERO',
  RoundingError = 'ROUNDING_ERROR',
  InvalidSignature = 'INVALID_SIGNATURE',
  SignatureIllegal = 'SIGNATURE_ILLEGAL',
  SignatureInvalid = 'SIGNATURE_INVALID',
  SignatureUnsupported = 'SIGNATURE_UNSUPPORTED',
  TakerOverpay = 'TAKER_OVERPAY',
  OrderOverfill = 'ORDER_OVERFILL',
  InvalidFillPrice = 'INVALID_FILL_PRICE',
  InvalidNewOrderEpoch = 'INVALID_NEW_ORDER_EPOCH',
  CompleteFillFailed = 'COMPLETE_FILL_FAILED',
  NegativeSpreadRequired = 'NEGATIVE_SPREAD_REQUIRED',
  ReentrancyIllegal = 'REENTRANCY_ILLEGAL',
  InvalidTxHash = 'INVALID_TX_HASH',
  InvalidTxSignature = 'INVALID_TX_SIGNATURE',
  FailedExecution = 'FAILED_EXECUTION',
  LengthGreaterThan0Required = 'LENGTH_GREATER_THAN_0_REQUIRED',
  LengthGreaterThan3Required = 'LENGTH_GREATER_THAN_3_REQUIRED',
  LengthGreaterThan131Required = 'LENGTH_GREATER_THAN_131_REQUIRED',
  Length0Required = 'LENGTH_0_REQUIRED',
  Length65Required = 'LENGTH_65_REQUIRED',
  InvalidAmount = 'INVALID_AMOUNT',
  TransferFailed = 'TRANSFER_FAILED',
  SenderNotAuthorized = 'SENDER_NOT_AUTHORIZED',
  TargetNotAuthorized = 'TARGET_NOT_AUTHORIZED',
  TargetAlreadyAuthorized = 'TARGET_ALREADY_AUTHORIZED',
  IndexOutOfBounds = 'INDEX_OUT_OF_BOUNDS',
  AuthorizedAddressMismatch = 'AUTHORIZED_ADDRESS_MISMATCH',
  OnlyContractOwner = 'ONLY_CONTRACT_OWNER',
  MakerNotWhitelisted = 'MAKER_NOT_WHITELISTED',
  TakerNotWhitelisted = 'TAKER_NOT_WHITELISTED',
  AssetProxyDoesNotExist = 'ASSET_PROXY_DOES_NOT_EXIST',
  LengthMismatch = 'LENGTH_MISMATCH',
  LibBytesGreaterThanZeroLengthRequired = 'GREATER_THAN_ZERO_LENGTH_REQUIRED',
  LibBytesGreaterOrEqualTo4LengthRequired = 'GREATER_OR_EQUAL_TO_4_LENGTH_REQUIRED',
  LibBytesGreaterOrEqualTo20LengthRequired = 'GREATER_OR_EQUAL_TO_20_LENGTH_REQUIRED',
  LibBytesGreaterOrEqualTo32LengthRequired = 'GREATER_OR_EQUAL_TO_32_LENGTH_REQUIRED',
  LibBytesGreaterOrEqualToNestedBytesLengthRequired = 'GREATER_OR_EQUAL_TO_NESTED_BYTES_LENGTH_REQUIRED',
  LibBytesGreaterOrEqualToSourceBytesLengthRequired = 'GREATER_OR_EQUAL_TO_SOURCE_BYTES_LENGTH_REQUIRED',
  Erc20InsufficientBalance = 'ERC20_INSUFFICIENT_BALANCE',
  Erc20InsufficientAllowance = 'ERC20_INSUFFICIENT_ALLOWANCE',
  FeePercentageTooLarge = 'FEE_PERCENTAGE_TOO_LARGE',
  ValueGreaterThanZero = 'VALUE_GREATER_THAN_ZERO',
  InvalidMsgValue = 'INVALID_MSG_VALUE',
  InsufficientEthRemaining = 'INSUFFICIENT_ETH_REMAINING',
  Uint256Overflow = 'UINT256_OVERFLOW',
  Erc721ZeroToAddress = 'ERC721_ZERO_TO_ADDRESS',
  Erc721OwnerMismatch = 'ERC721_OWNER_MISMATCH',
  Erc721InvalidSpender = 'ERC721_INVALID_SPENDER',
  Erc721ZeroOwner = 'ERC721_ZERO_OWNER',
  Erc721InvalidSelector = 'ERC721_INVALID_SELECTOR',
  WalletError = 'WALLET_ERROR',
  ValidatorError = 'VALIDATOR_ERROR',
  InvalidFunctionSelector = 'INVALID_FUNCTION_SELECTOR',
  InvalidAssetData = 'INVALID_ASSET_DATA',
  InvalidAssetProxy = 'INVALID_ASSET_PROXY',
  UnregisteredAssetProxy = 'UNREGISTERED_ASSET_PROXY',
  TxFullyConfirmed = 'TX_FULLY_CONFIRMED',
  TxNotFullyConfirmed = 'TX_NOT_FULLY_CONFIRMED',
  TimeLockIncomplete = 'TIME_LOCK_INCOMPLETE',
  InvalidFreeMemoryPtr = 'INVALID_FREE_MEMORY_PTR',
  AuctionInvalidAmount = 'INVALID_AMOUNT',
  AuctionExpired = 'AUCTION_EXPIRED',
  AuctionNotStarted = 'AUCTION_NOT_STARTED',
  AuctionInvalidBeginTime = 'INVALID_BEGIN_TIME',
  InvalidAssetDataEnd = 'INVALID_ASSET_DATA_END',
  InvalidOrBlockedExchangeSelector = 'INVALID_OR_BLOCKED_EXCHANGE_SELECTOR',
  BalanceQueryFailed = 'BALANCE_QUERY_FAILED',
  AtLeastOneAddressDoesNotMeetBalanceThreshold = 'AT_LEAST_ONE_ADDRESS_DOES_NOT_MEET_BALANCE_THRESHOLD',
  FromLessThanToRequired = 'FROM_LESS_THAN_TO_REQUIRED',
  ToLessThanLengthRequired = 'TO_LESS_THAN_LENGTH_REQUIRED',
  InvalidApprovalSignature = 'INVALID_APPROVAL_SIGNATURE',
  ApprovalExpired = 'APPROVAL_EXPIRED',
  InvalidOrigin = 'INVALID_ORIGIN',
  AmountEqualToOneRequired = 'AMOUNT_EQUAL_TO_ONE_REQUIRED',
  BadReceiverReturnValue = 'BAD_RECEIVER_RETURN_VALUE',
  CannotTransferToAddressZero = 'CANNOT_TRANSFER_TO_ADDRESS_ZERO',
  InsufficientAllowance = 'INSUFFICIENT_ALLOWANCE',
  NFTNotOwnedByFromAddress = 'NFT_NOT_OWNED_BY_FROM_ADDRESS',
  OwnersAndIdsMustHaveSameLength = 'OWNERS_AND_IDS_MUST_HAVE_SAME_LENGTH',
  TokenAndValuesLengthMismatch = 'TOKEN_AND_VALUES_LENGTH_MISMATCH',
  TransferRejected = 'TRANSFER_REJECTED',
  Uint256Underflow = 'UINT256_UNDERFLOW',
  InvalidIdsOffset = 'INVALID_IDS_OFFSET',
  InvalidValuesOffset = 'INVALID_VALUES_OFFSET',
  InvalidDataOffset = 'INVALID_DATA_OFFSET',
  InvalidAssetDataLength = 'INVALID_ASSET_DATA_LENGTH',
  InvalidStaticCallDataOffset = 'INVALID_STATIC_CALL_DATA_OFFSET',
  TargetNotEven = 'TARGET_NOT_EVEN',
  UnexpectedStaticCallResult = 'UNEXPECTED_STATIC_CALL_RESULT',
  TransfersSuccessful = 'TRANSFERS_SUCCESSFUL',
  InsufficientFunds = 'INSUFFICIENT_FUNDS',
  TxAlreadyExecuted = 'TX_ALREADY_EXECUTED',
  DefaultTimeLockIncomplete = 'DEFAULT_TIME_LOCK_INCOMPLETE',
  CustomTimeLockIncomplete = 'CUSTOM_TIME_LOCK_INCOMPLETE',
  EqualLengthsRequired = 'EQUAL_LENGTHS_REQUIRED',
  OnlyCallableByWallet = 'ONLY_CALLABLE_BY_WALLET',
}

export type AvailableSignatureTypesV3 = 'eoa' | 'eip1271';

export interface SigningOptionsV3 {
  signatureType: AvailableSignatureTypesV3; // | 'autodetect' ? and remove autodetectSignatureType maybe?
  autodetectSignatureType: boolean;
}
