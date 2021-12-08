import getUnixTime from 'date-fns/getUnixTime';
import { BigNumber } from '@ethersproject/bignumber';
import { randomBytes } from '@ethersproject/random';
import { _TypedDataEncoder } from '@ethersproject/hash';
import { NULL_ADDRESS, ZERO_AMOUNT } from './eth';
import type {
  ERC20AssetData,
  ERC721AssetData,
  ERC1155AssetData,
  MultiAssetData,
  Order,
} from '../sdk/types';

const TRADER_ADDRESS_IDENTIFIER = '0xBCC02a155c374263321155555Ccf41070017649e';

const NULL_BYTES = '0x';

// const MAX_DIGITS_IN_UNSIGNED_256_INT = 78;

export const INFINITE_TIMESTAMP_SEC = BigNumber.from(2524604400);

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
  type: 'ERC20'; //SupportedTokenTypes.ERC20
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
  //   tokenIds: string[]
  //   tokenValues: string[]
}

/**
 * Mimic the erc721 duck type
 */
export interface UserFacingERC1155AssetDataSerializedNormalizedSingle {
  tokenAddress: string;
  tokenId: string;
  type: 'ERC1155';
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
  chainId: number;
  makerAddress: string;
  takerAddress?: string;
  expiration?: Date;
  exchangeAddress?: string;
  salt?: string;
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

export const getEipDomain = (
  chainId: number,
  exchangeContractAddress: string
) => ({
  name: '0x Protocol',
  version: '3.0.0',
  chainId: chainId.toString(10),
  verifyingContract: exchangeContractAddress,
});

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

export const hashOrder = (
  order: Order,
  chainId: number,
  exchangeContractAddress: string
): string =>
  _TypedDataEncoder.hash(
    getEipDomain(chainId, exchangeContractAddress),
    EIP712_TYPES,
    order
  );

export const normalizeOrder = (order: Order): Order => {
  return {
    makerAddress: order.makerAddress.toLowerCase(),
    takerAddress: order.takerAddress.toLowerCase(),
    feeRecipientAddress: order.feeRecipientAddress.toLowerCase(),
    senderAddress: order.senderAddress.toLowerCase(),
    makerAssetAmount: order.makerAssetAmount.toString(),
    takerAssetAmount: order.takerAssetAmount.toString(),
    makerFee: order.makerFee.toString(),
    takerFee: order.takerFee.toString(),
    expirationTimeSeconds: order.expirationTimeSeconds.toString(),
    salt: order.salt.toString(),
    makerAssetData: order.makerAssetData.toLowerCase(),
    takerAssetData: order.takerAssetData.toLowerCase(),
    makerFeeAssetData: order.makerFeeAssetData.toLowerCase(),
    takerFeeAssetData: order.takerFeeAssetData.toLowerCase(),
    signature: order.signature?.toLowerCase(),
  };
};

export const generateOrderFromAssetDatas = (orderConfig: {
  makerAddress: string;
  makerAssetData: string;
  takerAssetData: string;
  makerAssetAmount: BigNumber;
  takerAssetAmount: BigNumber;
  chainId: number;
  exchangeAddress: string;
  takerAddress?: string;
  expiration?: Date;
}): Order => {
  const {
    chainId,
    exchangeAddress,
    makerAssetAmount,
    takerAssetAmount,
    makerAddress,
    makerAssetData,
    takerAssetData,
    takerAddress,
    expiration,
  } = orderConfig;

  const expirationTimeSeconds = expiration
    ? BigNumber.from(getUnixTime(expiration))
    : INFINITE_TIMESTAMP_SEC;

  const order: ZeroExOrder = {
    makerAddress,
    makerAssetAmount: makerAssetAmount.toString(),
    makerAssetData,
    takerAddress: takerAddress || NULL_ADDRESS,
    takerAssetAmount: takerAssetAmount.toString(),
    takerAssetData,
    expirationTimeSeconds: expirationTimeSeconds.toString(),
    // Stuff that doesn't really matter but is required
    senderAddress: NULL_ADDRESS,
    feeRecipientAddress: TRADER_ADDRESS_IDENTIFIER,
    salt: randomBytes(32).toString(),
    makerFeeAssetData: NULL_BYTES,
    takerFeeAssetData: NULL_BYTES,
    makerFee: ZERO_AMOUNT.toString(),
    takerFee: ZERO_AMOUNT.toString(),
  };

  return order;
};
