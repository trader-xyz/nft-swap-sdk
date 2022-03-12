import flatten from 'lodash/flatten';
import type { ContractTransaction } from '@ethersproject/contracts';
import { BaseProvider, Provider } from '@ethersproject/providers';
import {
  arrayify,
  hexConcat,
  hexDataLength,
  hexDataSlice,
  hexlify,
  joinSignature,
  splitSignature,
} from '@ethersproject/bytes';
import { verifyTypedData } from '@ethersproject/wallet';
import { _TypedDataEncoder } from '@ethersproject/hash';
import { BigNumber } from '@ethersproject/bignumber';
import { Interface } from '@ethersproject/abi';
import type { Signer, TypedDataSigner } from '@ethersproject/abstract-signer';
import {
  generateOrderFromAssetDatas,
  generateTimeBasedSalt,
  getEipDomain,
  normalizeOrder,
} from '../../utils/v3/order';
import { NULL_ADDRESS } from '../../utils/eth';
import {
  decodeAssetData,
  encodeAssetData,
  encodeMultiAssetAssetData,
  getAmountFromAsset,
} from '../../utils/v3/asset-data';
import {
  ERC1155__factory,
  ERC20__factory,
  ERC721__factory,
  ExchangeContract,
} from '../../contracts';
import { UnexpectedAssetTypeError } from '../error';
import {
  AdditionalOrderConfig,
  AssetProxyId,
  AvailableSignatureTypesV3,
  EIP712_TYPES,
  ERC1155AssetDataSerialized,
  ERC20AssetDataSerialized,
  ERC721AssetDataSerialized,
  MultiAssetDataSerializedRecursivelyDecoded,
  Order,
  OrderInfoV3,
  OrderStatusV3,
  SerializedAvailableAssetDataTypesDecoded,
  SignedOrder,
  SigningOptionsV3,
  SwappableAsset,
  UserFacingERC1155AssetDataSerializedNormalizedSingle,
  UserFacingERC20AssetDataSerialized,
  UserFacingERC721AssetDataSerialized,
  UserFacingSerializedSingleAssetDataTypes,
} from './types';
import { encodeTypedDataHash, TypedData } from '../../utils/typed-data';
import { EIP1271ZeroExDataAbi } from '../../utils/v3/eip1271';
import { convertCollectionToBN } from '../../utils/bn/convert';
import type {
  ApprovalStatus,
  PayableOverrides,
  TransactionOverrides,
} from '../common/types';

export const cancelOrder = (
  exchangeContract: ExchangeContract,
  order: Order
) => {
  return exchangeContract.cancelOrder(order);
};

export const getOrderInfo = async (
  exchangeContract: ExchangeContract,
  order: Order
): Promise<OrderInfoV3> => {
  const orderInfo = await exchangeContract.getOrderInfo(order);
  return orderInfo as OrderInfoV3;
};

export const getOrderStatus = async (
  exchangeContract: ExchangeContract,
  order: Order
): Promise<OrderStatusV3> => {
  const orderInfo = await exchangeContract.getOrderInfo(order);
  return orderInfo.orderStatus as OrderStatusV3;
};

export const cancelOrders = (
  exchangeContract: ExchangeContract,
  orders: Array<Order>,
  overrides?: PayableOverrides
) => {
  return exchangeContract.batchCancelOrders(orders, overrides);
};

export const cancelOrdersUpToNow = (
  exchangeContract: ExchangeContract,
  unixTimestampAsSalt: string = generateTimeBasedSalt()
) => {
  exchangeContract.cancelOrdersUpTo(unixTimestampAsSalt);
};

export const hashOrder = (
  order: Order,
  chainId: number,
  exchangeContractAddress: string
): string => {
  const EIP712_DOMAIN = getEipDomain(chainId, exchangeContractAddress);
  return _TypedDataEncoder.hash(EIP712_DOMAIN, EIP712_TYPES, order);
};

export type InterallySupportedAssetFormat =
  UserFacingSerializedSingleAssetDataTypes;

export const signOrderWithEip1271 = async (
  order: Order,
  signer: Signer,
  chainId: number,
  exchangeContractAddress: string
) => {
  const domain = getEipDomain(chainId, exchangeContractAddress);
  const types = EIP712_TYPES;
  const value = order;

  const typedData: TypedData = {
    domain,
    types,
    message: value,
  };

  const orderHash = encodeTypedDataHash(typedData);

  const msg = new Interface(EIP1271ZeroExDataAbi).encodeFunctionData(
    'OrderWithHash',
    [order, orderHash]
  );

  const rawSignatureFromContractWallet = await signer.signMessage(
    arrayify(msg)
  );

  return rawSignatureFromContractWallet;
};

export const signOrderWithEoaWallet = async (
  order: Order,
  signer: TypedDataSigner,
  chainId: number,
  exchangeContractAddress: string
) => {
  const domain = getEipDomain(chainId, exchangeContractAddress);
  const types = EIP712_TYPES;
  const value = order;

  const rawSignatureFromEoaWallet = await signer._signTypedData(
    domain,
    types,
    value
  );

  return rawSignatureFromEoaWallet;
};

export const checkIfContractWallet = async (
  provider: Provider,
  walletAddress: string
): Promise<boolean> => {
  let isContractWallet: boolean = false;
  if (provider.getCode) {
    let walletCode = await provider.getCode(walletAddress);
    // Wallet Code returns '0x' if no contract address is associated with
    // Note: Lazy loaded contract wallets will show 0x initially, so we fall back to feature detection
    if (walletCode && walletCode != '0x') {
      isContractWallet = true;
    }
  }
  let isSequence = !!(provider as any)._isSequenceProvider;
  if (isSequence) {
    isContractWallet = true;
  }
  // Walletconnect hides the real provider in the provider (yo dawg)
  let providerToUse = (provider as any).provider;
  if (providerToUse?.isWalletConnect) {
    const isSequenceViaWalletConnect = !!(
      (providerToUse as any).connector?._peerMeta?.description === 'Sequence'
    );
    if (isSequenceViaWalletConnect) {
      isContractWallet = true;
    }
  }

  return isContractWallet;
};

export const signOrder = async (
  order: Order,
  signerAddress: string,
  signer: Signer,
  provider: Provider,
  chainId: number,
  exchangeContractAddress: string,
  signingOptions?: Partial<SigningOptionsV3>
): Promise<SignedOrder> => {
  try {
    let method: AvailableSignatureTypesV3 = 'eoa';
    // If we have any specific signature type overrides, prefer those
    if (signingOptions?.signatureType === 'eip1271') {
      method = 'eip1271';
    } else if (signingOptions?.signatureType === 'eoa') {
      method = 'eoa';
    } else {
      // Try to detect...
      if (signingOptions?.autodetectSignatureType === false) {
        method = 'eoa';
      } else {
        // If we made it here, consumer has no preferred signing method,
        // let's try feature detection to automagically pick a signature type
        // By default we fallback to EOA signing if we can't figure it out.

        // Let's try to determine if the signer is a contract wallet or not.
        // If it is, we'll try EIP-1271, otherwise we'll do a normal sign
        const isContractWallet = await checkIfContractWallet(
          provider,
          signerAddress
        );
        if (isContractWallet) {
          method = 'eip1271';
        } else {
          method = 'eoa';
        }
      }
    }
    let signature: string;
    switch (method) {
      case 'eoa':
        const rawEip712Signature = await signOrderWithEoaWallet(
          order,
          signer as unknown as TypedDataSigner,
          chainId,
          exchangeContractAddress
        );
        signature = prepareOrderSignatureFromEoaWallet(rawEip712Signature);
        break;
      case 'eip1271':
        const rawEip1271Signature = (signature = await signOrderWithEip1271(
          order,
          signer,
          chainId,
          exchangeContractAddress
        ));
        signature =
          prepareOrderSignatureFromContractWallet(rawEip1271Signature);
        break;
      default:
        throw new Error(`Unknown signature method chosen: ${method}`);
    }

    const signedOrder: SignedOrder = {
      ...order,
      signature,
    };

    return signedOrder;
  } catch (e) {
    console.log('error signing order', e);
    throw e;
  }
};

// export const prepareOrderSignature = (
//   rawSignature: string,
//   method?: AvailableSignatureTypes
// ) => {
//   let preferredMethod = method ?? 'eoa';
//   try {
//     return prepareOrderSignatureFromEoaWallet(rawSignature);
//   } catch (e) {
//     console.log('prepareOrderSignature:Errror preparing order signature', e);
//     console.log('Attempting to decode contract wallet signature');
//     try {
//       return prepareOrderSignatureFromContractWallet(rawSignature);
//     } catch (e) {
//       throw e;
//     }
//   }
// };

export const prepareOrderSignatureFromEoaWallet = (rawSignature: string) => {
  // Append the signature type (eg. "0x02" for EIP712 signatures)
  // at the end of the signature since this is what 0x expects
  const signature = splitSignature(rawSignature);
  return hexConcat([hexlify(signature.v), signature.r, signature.s, '0x02']);
};

export const prepareOrderSignatureFromContractWallet = (
  rawSignature: string
) => {
  // Append the signature type (eg. "0x07" for EIP1271 signatures)
  // at the end of the signature since this is what 0x expects
  // See: https://github.com/0xProject/ZEIPs/issues/33
  return hexConcat([rawSignature, '0x07']);
};

export const verifyOrderSignature = (
  order: Order,
  signature: string,
  chainId: number,
  exchangeContractAddress: string
) => {
  const EIP712_DOMAIN = getEipDomain(chainId, exchangeContractAddress);
  try {
    const maker = order.makerAddress.toLowerCase();
    const length = hexDataLength(signature);
    // Grab the V (exists at index 0 for 0x orders)
    const slicedSigV = hexDataSlice(signature, 0, 1);
    // Grab the R and S (index 1 through length - 1 b/c the end hex is the signature type so we strip that too)
    const slicedSig = hexDataSlice(signature, 1, length - 1);

    const derivedSignatureHex = hexConcat([slicedSig, slicedSigV]);
    const derivedSignature = joinSignature(derivedSignatureHex);

    const signer = verifyTypedData(
      EIP712_DOMAIN,
      EIP712_TYPES,
      order,
      derivedSignature
    );

    return maker.toLowerCase() === signer.toLowerCase();
  } catch (e) {
    console.log(e);
    return false;
  }
};

export const buildOrder = (
  makerAssets: Array<InterallySupportedAssetFormat>,
  takerAssets: Array<InterallySupportedAssetFormat>,
  orderConfig: AdditionalOrderConfig
): Order => {
  // Encode maker assets
  let makerAssetAmount: BigNumber;
  let makerAssetData: string;

  const makerAssetEligibleForSingleAsset = makerAssets.length === 1;
  if (makerAssetEligibleForSingleAsset) {
    const makerAsset = makerAssets[0];
    makerAssetAmount = BigNumber.from(getAmountFromAsset(makerAsset));
    makerAssetData = encodeAssetData(makerAsset, false);
  } else {
    const makerAssetAmounts = makerAssets.map((ma) => getAmountFromAsset(ma));
    const makerAssetDatas = makerAssets.map((ma) => encodeAssetData(ma, true));
    const makerMultiAsset = encodeMultiAssetAssetData(
      makerAssetAmounts,
      makerAssetDatas
    );
    makerAssetData = makerMultiAsset;
    makerAssetAmount = BigNumber.from(1); // needs to be 1 for multiasset wrapper amount (actual amounts are nested)
  }

  // Encode taker assets
  let takerAssetAmount: BigNumber;
  let takerAssetData: string;

  const takerAssetEligibleForSingleAsset = takerAssets.length === 1;
  // If we only have one asset to swap
  if (takerAssetEligibleForSingleAsset) {
    const takerAsset = takerAssets[0];
    takerAssetAmount = BigNumber.from(getAmountFromAsset(takerAsset));
    takerAssetData = encodeAssetData(takerAsset, false);
  } else {
    const takerAssetAmounts = takerAssets.map((ta) => getAmountFromAsset(ta));
    const takerAssetDatas = takerAssets.map((ta) => encodeAssetData(ta, true));
    const takerMultiAsset = encodeMultiAssetAssetData(
      convertCollectionToBN(takerAssetAmounts),
      takerAssetDatas
    );
    takerAssetData = takerMultiAsset;
    takerAssetAmount = BigNumber.from(1); // needs to be 1 for multiasset wrapper amount (actual amounts are nested)
  }

  const order = generateOrderFromAssetDatas({
    makerAssetAmount: makerAssetAmount,
    makerAssetData: makerAssetData,
    takerAddress: orderConfig.takerAddress ?? NULL_ADDRESS,
    takerAssetAmount: takerAssetAmount,
    takerAssetData: takerAssetData,
    exchangeAddress: orderConfig.exchangeAddress ?? '',
    ...orderConfig,
  });

  return order;
};

export const fillSignedOrder = async (
  signedOrder: SignedOrder,
  exchangeContract: ExchangeContract,
  overrides?: PayableOverrides
): Promise<ContractTransaction> => {
  return exchangeContract.fillOrKillOrder(
    normalizeOrder(signedOrder),
    signedOrder.takerAssetAmount,
    signedOrder.signature,
    overrides
  );
};

/**
 *
 * @param walletAddress Owner of the asset
 * @param exchangeProxyAddressForAsset Exchange Proxy address specific to the ERC type (e.g. use the 0x ERC721 Proxy if you're using a 721 asset). This is the address that will need approval & does the spending/swap.
 * @param asset
 * @param provider
 * @returns
 */
export const getApprovalStatus = async (
  walletAddress: string,
  exchangeProxyAddressForAsset: string,
  asset: InterallySupportedAssetFormat,
  provider: BaseProvider
): Promise<ApprovalStatus> => {
  switch (asset.type) {
    case 'ERC20':
      const erc20 = ERC20__factory.connect(asset.tokenAddress, provider);
      const erc20AllowanceBigNumber: BigNumber = await erc20.allowance(
        walletAddress,
        exchangeProxyAddressForAsset
      );
      // Weird issue with BigNumber and approvals...need to look into it, adding buffer.
      const MAX_APPROVAL_WITH_BUFFER = BigNumber.from(
        MAX_APPROVAL.toString()
      ).sub('100000000000000000');
      const approvedForMax = erc20AllowanceBigNumber.gte(
        MAX_APPROVAL_WITH_BUFFER
      );
      return {
        contractApproved: approvedForMax,
      };
    case 'ERC721':
      const erc721 = ERC721__factory.connect(asset.tokenAddress, provider);
      const erc721ApprovalForAllPromise = erc721.isApprovedForAll(
        walletAddress,
        exchangeProxyAddressForAsset
      );
      const erc721ApprovedAddressForIdPromise = erc721.getApproved(
        asset.tokenId
      );
      const [erc721ApprovalForAll, erc721ApprovedAddressForId] =
        await Promise.all([
          erc721ApprovalForAllPromise,
          erc721ApprovedAddressForIdPromise,
        ]);
      const tokenIdApproved =
        erc721ApprovedAddressForId.toLowerCase() ===
        exchangeProxyAddressForAsset.toLowerCase();
      return {
        contractApproved: erc721ApprovalForAll ?? false,
        tokenIdApproved: tokenIdApproved,
      };
    case 'ERC1155':
      const erc1155 = ERC1155__factory.connect(asset.tokenAddress, provider);
      const erc1155ApprovalForAll = await erc1155.isApprovedForAll(
        walletAddress,
        exchangeProxyAddressForAsset
      );
      return {
        contractApproved: erc1155ApprovalForAll ?? false,
      };
    default:
      throw new UnexpectedAssetTypeError((asset as any).type);
  }
};

// Some arbitrarily high number.
// TODO(johnrjj) - Support custom ERC20 approval amounts
export const MAX_APPROVAL = BigNumber.from(2).pow(118);

/**
 * @param exchangeProxyAddressForAsset Exchange Proxy address specific to the ERC type (e.g. use the 0x ERC721 Proxy if you're using a 721 asset). This is the address that will need approval & does the spending/swap.
 * @param asset
 * @param signer Signer, must be a signer not a provider, as signed transactions are needed to approve
 * @param approve Optional, can specify to unapprove asset when set to false
 * @returns
 */
export const approveAsset = async (
  exchangeProxyAddressForAsset: string,
  asset: InterallySupportedAssetFormat,
  signer: Signer,
  overrides: TransactionOverrides = {},
  approve: boolean = true
): Promise<ContractTransaction> => {
  switch (asset.type) {
    case 'ERC20':
      const erc20 = ERC20__factory.connect(asset.tokenAddress, signer);
      const erc20ApprovalTxPromise = erc20.approve(
        exchangeProxyAddressForAsset,
        approve ? MAX_APPROVAL.toString() : 0,
        {
          ...overrides,
        }
      );
      return erc20ApprovalTxPromise;
    case 'ERC721':
      const erc721 = ERC721__factory.connect(asset.tokenAddress, signer);
      const erc721ApprovalForAllPromise = erc721.setApprovalForAll(
        exchangeProxyAddressForAsset,
        approve,
        {
          ...overrides,
        }
      );
      return erc721ApprovalForAllPromise;
    case 'ERC1155':
      const erc1155 = ERC1155__factory.connect(asset.tokenAddress, signer);
      const erc1155ApprovalForAll = await erc1155.setApprovalForAll(
        exchangeProxyAddressForAsset,
        approve,
        {
          ...overrides,
        }
      );
      return erc1155ApprovalForAll;
    default:
      throw new UnexpectedAssetTypeError((asset as any).type);
  }
};

/**
 * @param exchangeProxyAddressForAsset Exchange Proxy address specific to the ERC type (e.g. use the 0x ERC721 Proxy if you're using a 721 asset). This is the address that will need approval & does the spending/swap.
 * @param asset
 * @param signer Signer, must be a signer not a provider, as signed transactions are needed to approve
 * @param approve Optional, can specify to unapprove asset when set to false
 * @returns
 */
export const estimateGasForApproval = async (
  exchangeProxyAddressForAsset: string,
  asset: InterallySupportedAssetFormat,
  signer: Signer,
  overrides: TransactionOverrides = {},
  approve: boolean = true
): Promise<BigNumber> => {
  switch (asset.type) {
    case 'ERC20':
      const erc20 = ERC20__factory.connect(asset.tokenAddress, signer);
      const erc20ApprovalTxPromise = erc20.estimateGas.approve(
        exchangeProxyAddressForAsset,
        approve ? MAX_APPROVAL : 0
      );
      return erc20ApprovalTxPromise;
    case 'ERC721':
      const erc721 = ERC721__factory.connect(asset.tokenAddress, signer);
      const erc721ApprovalForAllPromise = erc721.estimateGas.setApprovalForAll(
        exchangeProxyAddressForAsset,
        approve
      );
      return erc721ApprovalForAllPromise;
    case 'ERC1155':
      const erc1155 = ERC1155__factory.connect(asset.tokenAddress, signer);
      const erc1155ApprovalForAll = await erc1155.estimateGas.setApprovalForAll(
        exchangeProxyAddressForAsset,
        approve
      );
      return erc1155ApprovalForAll;
    default:
      throw new UnexpectedAssetTypeError((asset as any).type);
  }
};

export const getSignatureTypeFromSignature = (signature: string): string => {
  const length = hexDataLength(signature);
  const signatureType = hexDataSlice(signature, length - 1);
  return signatureType;
};

export const estimateGasForFillOrder = async (
  signedOrder: SignedOrder,
  exchangeContract: ExchangeContract,
  _overrides?: PayableOverrides | undefined
) => {
  const estimatedGasRequiredForFill =
    await exchangeContract.estimateGas.fillOrder(
      normalizeOrder(signedOrder),
      signedOrder.takerAssetAmount,
      signedOrder.signature
    );
  return estimatedGasRequiredForFill;
};

export const convertDecodedAssetDataToUserFacingAssets = (
  decodedAssetData: SerializedAvailableAssetDataTypesDecoded,
  assetAmount: string
): Array<SwappableAsset> => {
  const assetProxyId = decodedAssetData.assetProxyId;

  switch (assetProxyId) {
    case AssetProxyId.ERC20:
      const decodedErc20 = decodedAssetData as ERC20AssetDataSerialized;
      const swappableErc20: UserFacingERC20AssetDataSerialized = {
        type: 'ERC20',
        amount: assetAmount,
        tokenAddress: decodedErc20.tokenAddress,
      };
      return [swappableErc20];
    case AssetProxyId.ERC721:
      const decodedErc721 = decodedAssetData as ERC721AssetDataSerialized;
      const swappableErc721: UserFacingERC721AssetDataSerialized = {
        type: 'ERC721',
        tokenAddress: decodedErc721.tokenAddress,
        tokenId: decodedErc721.tokenId,
      };
      return [swappableErc721];
    case AssetProxyId.ERC1155:
      const decodedErc1155 = decodedAssetData as ERC1155AssetDataSerialized;
      const swappableErc1155: UserFacingERC1155AssetDataSerializedNormalizedSingle =
        {
          type: 'ERC1155',
          tokenAddress: decodedErc1155.tokenAddress,
          tokenId: decodedErc1155.tokenIds[0],
          amount: decodedErc1155.tokenValues[0] ?? '1',
        };
      return [swappableErc1155];
    case AssetProxyId.MultiAsset:
      const multiAssetDecodedData =
        decodedAssetData as MultiAssetDataSerializedRecursivelyDecoded;
      const nestedAssets = flatten(
        multiAssetDecodedData.nestedAssetData.map((asset, idx) =>
          convertDecodedAssetDataToUserFacingAssets(
            asset,
            multiAssetDecodedData.amounts[idx]
          )
        )
      );
      const nestedAssetsWithCorrectAmounts: Array<SwappableAsset> =
        nestedAssets.map((nestedAsset, idx) => {
          const nestedAssetValueFromMultiAsset =
            multiAssetDecodedData.amounts[idx];
          // Overwrite original nested asset amount, b/c when its nested inside a multiasset encoding, the multiasset top level values take over.
          return {
            ...nestedAsset,
            amount: nestedAssetValueFromMultiAsset,
          };
        });
      return nestedAssetsWithCorrectAmounts;
    default:
      throw new Error(
        `Unsupported AssetProxyId ${(assetProxyId as any)?.type}`
      );
  }
};

export const getAssetsFromOrder = (
  order: Order
): { makerAssets: SwappableAsset[]; takerAssets: SwappableAsset[] } => {
  const decodedMakerAssetData = decodeAssetData(order.makerAssetData);
  const decodedTakerAssetData = decodeAssetData(order.takerAssetData);

  const makerAssets = convertDecodedAssetDataToUserFacingAssets(
    decodedMakerAssetData,
    order.makerAssetAmount
  );
  const takerAssets = convertDecodedAssetDataToUserFacingAssets(
    decodedTakerAssetData,
    order.takerAssetAmount
  );

  return {
    makerAssets,
    takerAssets,
  };
};

// export const loadApprovalStatusAll = async (assets: Array<InterallySupportedAsset>) => {
//   const assetsGroupedByContractAddress = groupBy(assets, (asset) => asset.tokenAddress)
//   const todoPromises = Object.entries(assetsGroupedByContractAddress).map(
//     ([contractAddress, assetsWithSameTakerAddress]) => {
//       const type = assetsWithSameTakerAddress[0]?.type
//       switch (type) {
//         case SupportedTokenTypes.ERC20:
//           break
//         case SupportedTokenTypes.ERC721:
//           break
//         case SupportedTokenTypes.ERC1155:
//           break
//         default:
//           break
//       }
//     },
//   )
// }
