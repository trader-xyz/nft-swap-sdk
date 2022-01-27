import getUnixTime from 'date-fns/getUnixTime';
import { BigNumber } from '@ethersproject/bignumber';
import { _TypedDataEncoder } from '@ethersproject/hash';
import { NULL_ADDRESS, NULL_BYTES, ZERO_AMOUNT } from '../eth';
import {
  Order,
  EipDomain,
  EIP712_TYPES,
  ZeroExOrder,
} from '../../sdk/v3/types';

export const TRADER_ADDRESS_IDENTIFIER =
  '0xBCC02a155c374263321155555Ccf41070017649e';

export const INFINITE_TIMESTAMP_SEC = BigNumber.from(2524604400);

export const getEipDomain = (
  chainId: number,
  exchangeContractAddress: string
): EipDomain => ({
  name: '0x Protocol',
  version: '3.0.0',
  chainId: chainId.toString(10),
  verifyingContract: exchangeContractAddress,
});

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
  exchangeAddress: string;
  // Rest of params optional
  takerAddress?: string;
  expiration?: Date | number;
  salt?: string;
  feeRecipientAddress?: string;
  makerFeeAssetData?: string;
  takerFeeAssetData?: string;
  makerFee?: string;
  takerFee?: string;
}): Order => {
  const {
    makerAssetAmount,
    takerAssetAmount,
    makerAddress,
    makerAssetData,
    takerAssetData,
    takerAddress,
    expiration,
    salt,
    feeRecipientAddress,
    makerFeeAssetData,
    takerFeeAssetData,
    makerFee,
    takerFee,
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
    feeRecipientAddress: feeRecipientAddress ?? TRADER_ADDRESS_IDENTIFIER,
    salt: salt ?? generateSaltHash(),
    makerFeeAssetData: makerFeeAssetData ?? NULL_BYTES,
    takerFeeAssetData: takerFeeAssetData ?? NULL_BYTES,
    makerFee: makerFee ?? ZERO_AMOUNT.toString(),
    takerFee: takerFee ?? ZERO_AMOUNT.toString(),
  };

  return order;
};

export const generateTimeBasedSalt = () => {
  const unixTime = getUnixTime(new Date());
  return unixTime.toString(10);
};

const generateSaltHash = (manualSaltHashToUse?: string): string => {
  if (manualSaltHashToUse) {
    return manualSaltHashToUse;
  }
  return generateTimeBasedSalt();
};
