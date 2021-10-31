import { assetDataUtils } from '@0x/order-utils';
import { BigNumber } from '@0x/utils';
import {
  SupportedTokenTypes,
  UserFacingSerializedSingleAssetDataTypes,
} from './order';

const convertStringToBN = (s: string) => {
  return new BigNumber(s);
};

const convertCollectionToBN = (arr: string[]) => {
  return arr.map(convertStringToBN);
};

const encodeAssetData = (
  assetData: UserFacingSerializedSingleAssetDataTypes
): string => {
  switch (assetData.type) {
    case SupportedTokenTypes.ERC20:
      const erc20AssetData = assetDataUtils.encodeERC20AssetData(
        assetData.tokenAddress
      );
      return erc20AssetData;
    case SupportedTokenTypes.ERC721:
      const erc721AssetData = assetDataUtils.encodeERC721AssetData(
        assetData.tokenAddress,
        new BigNumber(assetData.tokenId)
      );
      return erc721AssetData;
    case SupportedTokenTypes.ERC1155:
      const tokenIds = assetData.tokens.map((x) => x.tokenId);
      const tokenValues = assetData.tokens.map((x) => x.tokenValue);
      const erc1155AssetData = assetDataUtils.encodeERC1155AssetData(
        assetData.tokenAddress,
        convertCollectionToBN(tokenIds),
        convertCollectionToBN(tokenValues),
        '0x' // Needs to be '0x' (not empty string) or else it won't work lol
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
