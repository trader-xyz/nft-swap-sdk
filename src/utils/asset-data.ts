import { BigNumber, BigNumberish } from '@ethersproject/bignumber';
import { hexConcat } from '@ethersproject/bytes';
import { defaultAbiCoder } from '@ethersproject/abi';
import {
  SupportedTokenTypes,
  UserFacingERC1155AssetDataSerializedNormalizedSingle,
  UserFacingERC20AssetDataSerialized,
  UserFacingERC721AssetDataSerialized,
  UserFacingSerializedSingleAssetDataTypes,
} from './order';
import { AssetProxyId } from '../sdk/types';
import { InterallySupportedAssetFormat } from '../sdk/pure';
import { UnexpectedAssetTypeError } from '../sdk/error';

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
  assetData: UserFacingSerializedSingleAssetDataTypes,
  erc1155EncodingForMultiAssetOrder: boolean = false
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
      let tokenValues: string[];
      if (erc1155EncodingForMultiAssetOrder) {
        tokenValues = assetData.tokens.map((_) => '1');
      } else {
        tokenValues = assetData.tokens.map((x) => x.tokenValue);
      }
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
      // Trader.sdk only supports trading 1 ERC1155 per _asset_ at a time,
      // so we can access the 0th index for our token
      // (You can still trade multiple ERC1155s per _order_).
      return assetData.tokens[0]?.tokenValue ?? '1';
    default:
      throw new Error(`Unsupported type ${(assetData as any)?.type}`);
  }
};

export type SwappableAsset =
  | UserFacingERC20AssetDataSerialized
  | UserFacingERC721AssetDataSerialized
  | UserFacingERC1155AssetDataSerializedNormalizedSingle;

export const convertAssetToInternalFormat = (
  swappable: SwappableAsset
): InterallySupportedAssetFormat => {
  switch (swappable.type) {
    // No converting needed
    case 'ERC20':
      return swappable;
    // No converting needed
    case 'ERC721':
      return swappable;
    // Convert normalized public ERC1155 interface to 0x internal asset data format
    // We do this to reduce complexity for end user SDK (and keep api same with erc721)
    case 'ERC1155':
      const zeroExErc1155AssetFormat = {
        tokenAddress: swappable.tokenAddress,
        tokens: [
          {
            tokenId: swappable.tokenId,
            tokenValue: swappable.amount || '1',
          },
        ],
        type: SupportedTokenTypes.ERC1155 as const,
      };
      return zeroExErc1155AssetFormat;
    default:
      throw new UnexpectedAssetTypeError((swappable as any)?.type ?? 'Unknown');
  }
};

export const convertAssetsToInternalFormat = (
  assets: Array<SwappableAsset>
): Array<InterallySupportedAssetFormat> => {
  return assets.map(convertAssetToInternalFormat);
};

export { encodeAssetData, getAmountFromAsset };
