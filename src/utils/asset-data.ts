import { BigNumber, BigNumberish } from '@ethersproject/bignumber';
import { hexConcat } from '@ethersproject/bytes';
import { defaultAbiCoder } from '@ethersproject/abi';

import {
  SupportedTokenTypes,
  UserFacingSerializedSingleAssetDataTypes,
} from './order';
import { AssetProxyId } from '../sdk/types';

const convertStringToBN = (s: string) => {
  return BigNumber.from(s);
};

const convertCollectionToBN = (arr: string[]) => {
  return arr.map(convertStringToBN);
};

export const encodeErc1155AssetData = (
  tokenAddress: string,
  tokenIds: BigNumberish[],
  values: BigNumberish[],
  callbackData: string
) =>
  hexConcat([
    AssetProxyId.ERC1155,
    defaultAbiCoder.encode(
      ['address', 'uint256[]', 'uint256[]', 'bytes'],
      [tokenAddress, tokenIds, values, callbackData]
    ),
  ]);

export const encodeErc20AssetData = (tokenAddress: string) =>
  hexConcat([
    AssetProxyId.ERC20,
    defaultAbiCoder.encode(['address'], [tokenAddress]),
  ]);

export const encodeErc721AssetData = (
  tokenAddress: string,
  tokenId: BigNumberish
) =>
  hexConcat([
    AssetProxyId.ERC721,
    defaultAbiCoder.encode(['address', 'uint256'], [tokenAddress, tokenId]),
  ]);

export const encodeMultiAssetAssetData = (
  values: BigNumberish[],
  nestedAssetData: string[]
) =>
  hexConcat([
    AssetProxyId.MultiAsset,
    defaultAbiCoder.encode(['uint256[]', 'bytes[]'], [values, nestedAssetData]),
  ]);

const encodeAssetData = (
  assetData: UserFacingSerializedSingleAssetDataTypes
): string => {
  switch (assetData.type) {
    case SupportedTokenTypes.ERC20:
      const erc20AssetData = encodeErc20AssetData(assetData.tokenAddress);
      return erc20AssetData;
    case SupportedTokenTypes.ERC721:
      const erc721AssetData = encodeErc721AssetData(
        assetData.tokenAddress,
        BigNumber.from(assetData.tokenId)
      );
      return erc721AssetData;
    case SupportedTokenTypes.ERC1155:
      const tokenIds = assetData.tokens.map((x) => x.tokenId);
      const tokenValues = assetData.tokens.map((x) => x.tokenValue);
      const erc1155AssetData = encodeErc1155AssetData(
        assetData.tokenAddress,
        convertCollectionToBN(tokenIds),
        convertCollectionToBN(tokenValues),
        '0x' // Needs to be '0x' (null bytes) (not empty string) or else it won't work lol
      );
      return erc1155AssetData;
    default:
      throw new Error(`Unsupported type ${(assetData as any)?.type}`);
  }
};

const getAmountFromAsset = (
  assetData: UserFacingSerializedSingleAssetDataTypes
): string => {
  switch (assetData.type) {
    case SupportedTokenTypes.ERC20:
      return assetData.amount;
    case SupportedTokenTypes.ERC721:
      return '1';
    case SupportedTokenTypes.ERC1155:
      return '1';
    default:
      throw new Error(`Unsupported type ${(assetData as any)?.type}`);
  }
};

export { encodeAssetData, getAmountFromAsset };
