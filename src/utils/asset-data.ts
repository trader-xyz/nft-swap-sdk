import { BigNumber } from '@ethersproject/bignumber';
import {
  encodeErc1155AssetData,
  encodeErc20AssetData,
  encodeErc721AssetData,
} from '../sdk/pure';
import {
  SupportedTokenTypes,
  UserFacingSerializedSingleAssetDataTypes,
} from './order';

const convertStringToBN = (s: string) => {
  return BigNumber.from(s);
};

const convertCollectionToBN = (arr: string[]) => {
  return arr.map(convertStringToBN);
};

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
