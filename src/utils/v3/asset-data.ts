import { BigNumber, BigNumberish } from '@ethersproject/bignumber';
import { hexConcat, hexDataLength, hexDataSlice } from '@ethersproject/bytes';
import { defaultAbiCoder } from '@ethersproject/abi';

import {
  AssetProxyId,
  ERC1155AssetDataSerialized,
  ERC20AssetDataSerialized,
  ERC721AssetDataSerialized,
  MultiAssetDataSerializedRecursivelyDecoded,
  SerializedAvailableAssetDataTypes,
  SerializedAvailableAssetDataTypesDecoded,
  SerializedSingleAssetDataTypes,
  SupportedTokenTypes,
  SwappableAsset,
  UserFacingSerializedSingleAssetDataTypes,
} from '../../sdk/v3/types';
import { InterallySupportedAssetFormat } from '../../sdk/v3/pure';
import { UnexpectedAssetTypeError } from '../../sdk/error';
import { convertCollectionToBN } from '../bn/convert';

export const encodeErc20AssetData = (tokenAddress: string) =>
  hexConcat([
    AssetProxyId.ERC20,
    defaultAbiCoder.encode(['address'], [tokenAddress]),
  ]);

export const decodeErc20AssetData = (
  encodedAssetData: string
): ERC20AssetDataSerialized => {
  const length = hexDataLength(encodedAssetData);
  const assetProxyId: string | undefined = hexDataSlice(encodedAssetData, 0, 4);
  const rest = hexDataSlice(encodedAssetData, 4);
  const data = defaultAbiCoder.decode(['address'], rest);

  const tokenAddress: string = data[0];
  return {
    assetProxyId: assetProxyId.toLowerCase(),
    tokenAddress: tokenAddress.toLowerCase(),
  };
};

export const encodeErc721AssetData = (
  tokenAddress: string,
  tokenId: BigNumberish
) =>
  hexConcat([
    AssetProxyId.ERC721,
    defaultAbiCoder.encode(['address', 'uint256'], [tokenAddress, tokenId]),
  ]);

export const decodeErc721AssetData = (
  encodedAssetData: string
): ERC721AssetDataSerialized => {
  const assetProxyId: string | undefined = hexDataSlice(encodedAssetData, 0, 4);
  const rest = hexDataSlice(encodedAssetData, 4);
  const data = defaultAbiCoder.decode(['address', 'uint256'], rest);

  const tokenAddress: string = data[0];
  const tokenId: BigNumber = data[1];

  return {
    assetProxyId: assetProxyId.toLowerCase(),
    tokenAddress: tokenAddress.toLowerCase(),
    tokenId: tokenId.toString(),
  };
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

export const decodeErc1155AssetData = (
  encodedAssetData: string
): ERC1155AssetDataSerialized => {
  const assetProxyId: string | undefined = hexDataSlice(encodedAssetData, 0, 4);

  const rest = hexDataSlice(encodedAssetData, 4);
  const data = defaultAbiCoder.decode(
    ['address', 'uint256[]', 'uint256[]', 'bytes'],
    rest
  );

  const tokenAddress: string = data[0];
  const tokenIds: BigNumber[] = data[1];
  const values: BigNumber[] = data[2];
  const callbackData: string = data[3];

  return {
    assetProxyId: assetProxyId.toLowerCase(),
    tokenAddress: tokenAddress.toLowerCase(),
    tokenIds: tokenIds.map((id) => id.toString()),
    tokenValues: values.map((val) => val.toString()),
    callbackData,
  };
};

export const encodeMultiAssetAssetData = (
  values: BigNumberish[],
  nestedAssetData: string[]
) =>
  hexConcat([
    AssetProxyId.MultiAsset,
    defaultAbiCoder.encode(['uint256[]', 'bytes[]'], [values, nestedAssetData]),
  ]);

export const decodeMultiAssetData = (encodedAssetData: string) => {
  const assetProxyId: string | undefined = hexDataSlice(encodedAssetData, 0, 4);

  const rest = hexDataSlice(encodedAssetData, 4);
  const data = defaultAbiCoder.decode(['uint256[]', 'bytes[]'], rest);

  const values: BigNumber[] = data[0];
  const nestedAssetDatas: string[] = data[1];

  return {
    assetProxyId: assetProxyId.toLowerCase(),
    amounts: values.map((val) => val.toString()),
    nestedAssetData: nestedAssetDatas.map(
      (nestedAssetData) =>
        decodeAssetData(nestedAssetData) as SerializedSingleAssetDataTypes // Cast b/c multiasset can only happen at depth 0, only singe asset datas can be nested
    ),
  };
};

export const encodeAssetData = (
  assetData: UserFacingSerializedSingleAssetDataTypes,
  // To express ERC1155 amounts inside a multiasset order, you cannot encode the amount on the indiviual asset data,
  // It needs to be paired with the [asset, amount] tuple inside the Multiasset order format order array (I know, a bit confusing)
  // But if you're encoding erc1155 asset data within the context of a multi-asset order, this boolean should be true
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

export const decodeAssetData = (
  encodedAssetData: string
): SerializedAvailableAssetDataTypesDecoded => {
  const assetProxyId: string | undefined = hexDataSlice(encodedAssetData, 0, 4);

  switch (assetProxyId) {
    case AssetProxyId.ERC20:
      const erc20AssetData = decodeErc20AssetData(encodedAssetData);
      return erc20AssetData;
    case AssetProxyId.ERC721:
      const erc721AssetData = decodeErc721AssetData(encodedAssetData);
      return erc721AssetData;
    case AssetProxyId.ERC1155:
      const erc1155AssetData = decodeErc1155AssetData(encodedAssetData);
      return erc1155AssetData;
    case AssetProxyId.MultiAsset:
      const multiAssetData = decodeMultiAssetData(encodedAssetData);
      return multiAssetData;
    default:
      throw new Error(
        `Unsupported AssetProxyId ${(assetProxyId as any)?.type}`
      );
  }
};

export const getAmountFromAsset = (
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
