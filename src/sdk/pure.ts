import type { ContractTransaction } from '@ethersproject/contracts';
// import { TypedDataSigner } from '@ethersproject/abstract-signer';
import { BaseProvider, Provider } from '@ethersproject/providers';
import { BigNumber, BigNumberish } from '@ethersproject/bignumber';
import {
  arrayify,
  hexConcat,
  hexlify,
  splitSignature,
} from '@ethersproject/bytes';
import { verifyTypedData } from '@ethersproject/wallet';
import { _TypedDataEncoder } from '@ethersproject/hash';
import {
  AdditionalOrderConfig,
  EIP712_TYPES,
  generateOrderFromAssetDatas,
  getEipDomain,
  normalizeOrder,
  SupportedTokenTypes,
  UserFacingSerializedSingleAssetDataTypes,
} from '../utils/order';
import { NULL_ADDRESS } from '../utils/eth';
import {
  encodeAssetData,
  encodeMultiAssetAssetData,
  getAmountFromAsset,
} from '../utils/asset-data';
import {
  ERC1155__factory,
  ERC20__factory,
  ERC721__factory,
  ExchangeContract,
} from '../contracts';
import { UnexpectedAssetTypeError, UnsupportedChainId } from './error';
import type { AddressesForChain, Order, SignedOrder } from './types';
import addresses from '../addresses.json';
import { encodeTypedDataHash, TypedData } from '../utils/typed-data';
import { Interface } from '@ethersproject/abi';
import { EIP1271ZeroExDataAbi } from '../utils/eip1271';
import { Signer } from 'ethers';

export enum AssetProxyId {
  ERC20 = '0xf47261b0',
  ERC721 = '0x02571792',
  MultiAsset = '0x94cfcdd7',
  ERC1155 = '0xa7cb5fb7',
  StaticCall = '0xc339d10a',
}

export enum ChainId {
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

const convertStringToBN = (s: string) => {
  return BigNumber.from(s);
};

const convertCollectionToBN = (arr: string[]) => {
  return arr.map(convertStringToBN);
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

export const signOrder = async (
  order: Order,
  signerAddress: string,
  signer: Signer,
  provider: Provider,
  chainId: number,
  exchangeContractAddress: string
): Promise<SignedOrder> => {
  try {
    // Let's try to determine if the signer is a contract wallet or not.
    // If it is, we'll try EIP-1271, otherwise we'll do a normal sign
    let isContractWallet = false;

    let walletCode = await provider.getCode(signerAddress);
    // Wallet Code returns '0x' if no contract address is associated with
    // Note: Lazy loaded contract wallets will show 0x initially, so we fall back to feature detection
    if (walletCode && walletCode != '0x') {
      isContractWallet = true;
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

    console.log(rawSignatureFromContractWallet, rawSignatureFromContractWallet);

    // const rawSignatureFromEoaWallet = await signer._signTypedData(domain, types, value);

    const signedOrder: SignedOrder = {
      ...order,
      signature: rawSignatureFromContractWallet,
    };

    return signedOrder;
  } catch (e) {
    console.log('error signing order', e);
    throw e;
  }
};

export const prepareOrderSignature = (rawSignature: string) => {
  // Append the signature type (eg. "0x02" for EIP712 signatures)
  // at the end of the signature since this is what 0x expects
  const signature = splitSignature(rawSignature);
  return hexConcat([hexlify(signature.v), signature.r, signature.s, '0x02']);
};

export const prepareOrderSignatureContractWallet = (rawSignature: string) => {
  // Append the signature type (eg. "0x07" for EIP712 signatures)
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
    const signer = verifyTypedData(
      EIP712_DOMAIN,
      EIP712_TYPES,
      order,
      signature
    );

    return maker.toLowerCase() === signer.toLowerCase();
  } catch {
    return false;
  }
};

export const buildOrder = (
  makerAssets: Array<InterallySupportedAssetFormat>,
  takerAssets: Array<InterallySupportedAssetFormat>,
  orderConfig: AdditionalOrderConfig
): Order => {
  const makerAssetAmounts = makerAssets.map((ma) => getAmountFromAsset(ma));
  const makerAssetDatas = makerAssets.map((ma) => encodeAssetData(ma));
  const makerMultiAsset = encodeMultiAssetAssetData(
    makerAssetAmounts,
    makerAssetDatas
  );

  const takerAssetAmounts = takerAssets.map((ta) => getAmountFromAsset(ta));
  const takerAssetDatas = takerAssets.map((ta) => encodeAssetData(ta));
  const takerMultiAsset = encodeMultiAssetAssetData(
    convertCollectionToBN(takerAssetAmounts),
    takerAssetDatas
  );

  const order = generateOrderFromAssetDatas({
    makerAssetAmount: BigNumber.from(1), // needs to be 1
    makerAssetData: makerMultiAsset,
    takerAddress: orderConfig.takerAddress ?? NULL_ADDRESS,
    takerAssetAmount: BigNumber.from(1), // needs to be 1
    takerAssetData: takerMultiAsset,
    exchangeAddress: orderConfig.exchangeAddress ?? '', // look up address from chain id if null,
    ...orderConfig,
  });

  return order;
};

export interface PayableOverrides extends TransactionOverrides {
  value?: BigNumberish | Promise<BigNumberish>;
}

export const sendSignedOrderToEthereum = async (
  signedOrder: SignedOrder,
  exchangeContract: ExchangeContract,
  overrides?: PayableOverrides
): Promise<ContractTransaction> => {
  return exchangeContract.fillOrder(
    normalizeOrder(signedOrder),
    signedOrder.takerAssetAmount,
    // prepareOrderSignature(signedOrder.signature), // EOA signatures...
    prepareOrderSignatureContractWallet(signedOrder.signature), // Contract wallet signatures.
    overrides
  );
};

/**
 * Approval status of an ERC20, ERC721, or ERC1155 asset/item.
 * The default approval spending address is the ExchangeProxy adapter specific to ERC type.
 */
export type ApprovalStatus = {
  /**
   * contractApproved is the standard approval check.
   * Equivalent to 'isApprovedForAll' for ERC721 and ERC1155, and is the normal allowance for ERC20
   */
  contractApproved: boolean;
  /**
   * Only exists for ERC721, tokenIdApproved checks if tokenId is approved. You can be in a state where tokenId is approved but isApprovedForAll is false
   * In this case, you do not need to approve. ERC1155 does not have support for individual tokenId approvals. Not applicable for ERC20s since they are fungible
   */
  tokenIdApproved?: boolean;
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
      const approvedForMax = erc20AllowanceBigNumber.gte(MAX_APPROVAL);
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

export const MAX_APPROVAL = BigNumber.from(2).pow(128).sub(1);

export interface TransactionOverrides {
  gasLimit?: BigNumberish | Promise<BigNumberish>;
  gasPrice?: BigNumberish | Promise<BigNumberish>;
  maxFeePerGas?: BigNumberish | Promise<BigNumberish>;
  maxPriorityFeePerGas?: BigNumberish | Promise<BigNumberish>;
  nonce?: BigNumberish | Promise<BigNumberish>;
  type?: number;
  accessList?: any;
  customData?: Record<string, any>;
}

/**
 *
 * @param walletAddress Owner of the asset
 * @param exchangeProxyAddressexchangeProxyAddressForAsset Exchange Proxy address specific to the ERC type (e.g. use the 0x ERC721 Proxy if you're using a 721 asset). This is the address that will need approval & does the spending/swap.
 * @param asset
 * @param signer Signer, must be a signer not a provider, as signed transactions are needed to approve
 * @param approve Optional, can specify to unapprove asset when set to false
 * @returns
 */
export const approveAsset = async (
  _walletAddress: string,
  exchangeProxyAddressexchangeProxyAddressForAsset: string,
  asset: InterallySupportedAssetFormat,
  signer: Signer,
  overrides: TransactionOverrides = {},
  approve: boolean = true
): Promise<ContractTransaction> => {
  switch (asset.type) {
    case 'ERC20':
      const erc20 = ERC20__factory.connect(asset.tokenAddress, signer);
      const erc20ApprovalTxPromise = erc20.approve(
        exchangeProxyAddressexchangeProxyAddressForAsset,
        approve ? MAX_APPROVAL : 0,
        {
          // from: walletAddress,
          ...overrides,
        }
      );
      return erc20ApprovalTxPromise;
    case 'ERC721':
      const erc721 = ERC721__factory.connect(asset.tokenAddress, signer);
      const erc721ApprovalForAllPromise = erc721.setApprovalForAll(
        exchangeProxyAddressexchangeProxyAddressForAsset,
        approve,
        {
          // from: walletAddress,
          ...overrides,
        }
      );
      return erc721ApprovalForAllPromise;
    case 'ERC1155':
      const erc1155 = ERC1155__factory.connect(asset.tokenAddress, signer);
      const erc1155ApprovalForAll = await erc1155.setApprovalForAll(
        exchangeProxyAddressexchangeProxyAddressForAsset,
        approve,
        {
          // from: walletAddress,
          ...overrides,
        }
      );
      return erc1155ApprovalForAll;
    default:
      throw new UnexpectedAssetTypeError((asset as any).type);
  }
};

const getZeroExAddressesForChain = (
  chainId: number
): AddressesForChain | undefined => {
  const chainIdString = chainId.toString(10);
  const maybeAddressesForChain: AddressesForChain | undefined = (
    addresses as { [key: string]: AddressesForChain }
  )[chainIdString];
  return maybeAddressesForChain;
};

export const getProxyAddressForErcType = (
  assetType: SupportedTokenTypes,
  chainId: number
) => {
  const zeroExAddresses = getZeroExAddressesForChain(chainId);
  if (!zeroExAddresses) {
    throw new UnsupportedChainId(chainId);
  }
  switch (assetType) {
    case 'ERC20':
      return zeroExAddresses.erc20Proxy;
    case 'ERC721':
      return zeroExAddresses.erc721Proxy;
    case 'ERC1155':
      return zeroExAddresses.erc1155Proxy;
    default:
      throw new UnexpectedAssetTypeError(assetType);
  }
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
