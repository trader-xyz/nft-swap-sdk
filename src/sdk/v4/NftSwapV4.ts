import { Signer, TypedDataSigner } from '@ethersproject/abstract-signer';
import { BaseProvider } from '@ethersproject/providers';
import { BigNumber, ContractTransaction } from 'ethers';
import { IZeroEx, IZeroEx__factory } from '../../contracts';
import { NULL_ADDRESS } from '../../utils/eth';
import { ApprovalStatus, BaseNftSwap } from '../common/types';
import { UnexpectedAssetTypeError } from '../error';
import {
  approveAsset,
  parseRawSignature,
  signOrderWithEoaWallet,
  SwappableAsset,
  TradeDirection,
  UserFacingERC1155AssetDataSerializedNormalizedSingle,
  UserFacingERC20AssetDataSerialized,
  UserFacingERC721AssetDataSerialized,
} from './pure';
import {
  ERC1155OrderStruct,
  ERC721OrderStruct,
  NftOrderV4,
  SignatureStruct,
  SupportedChainIds,
} from './types';

export enum SupportedChainIdsV4 {
  Ropsten = 3,
}

const EXCHANGE_PROXY_DEFAULT_ADDRESS_ROPSTEN =
  '0xdef1c0ded9bec7f1a1670819833240f027b25eff';

//  export interface INftSwapV4 extends BaseNftSwap {
//   signOrder: (
//     order: NftOrderV4,
//     signerAddress: string,
//     signer: Signer,
//     signingOptions?: Partial<SigningOptions>
//   ) => Promise<SignedOrder>;
//   buildOrder: (
//     makerAssets: Array<SwappableAsset>,
//     takerAssets: Array<SwappableAsset>,
//     makerAddress: string,
//     orderConfig?: Partial<BuildOrderAdditionalConfig>
//   ) => NftOrderV4;
//   loadApprovalStatus: (
//     asset: SwappableAsset,
//     walletAddress: string,
//     approvalOverrides?: Partial<ApprovalOverrides>
//   ) => Promise<ApprovalStatus>;
//   approveTokenOrNftByAsset: (
//     asset: SwappableAsset,
//     walletAddress: string,
//     approvalTransactionOverrides?: Partial<TransactionOverrides>,
//     approvalOverrides?: Partial<ApprovalOverrides>
//   ) => Promise<ContractTransaction>;
//   fillSignedOrder: (
//     signedOrder: SignedOrder,
//     fillOrderOverrides?: Partial<FillOrderOverrides>
//   ) => Promise<ContractTransaction>;
//   awaitTransactionHash: (txHash: string) => Promise<TransactionReceipt>;
//   cancelOrder: (order: NftOrderV4) => Promise<ContractTransaction>;
//   waitUntilOrderFilledOrCancelled: (
//     order: NftOrderV4,
//     timeoutInMs?: number,
//     pollOrderStatusFrequencyInMs?: number,
//     throwIfStatusOtherThanFillableOrFilled?: boolean
//   ) => Promise<OrderInfo | null>;
//   getOrderStatus: (order: NftOrderV4) => Promise<OrderStatus>;
//   getOrderInfo: (order: NftOrderV4) => Promise<OrderInfo>;
//   getOrderHash: (order: NftOrderV4) => string;
//   getTypedData: (
//     chainId: number,
//     exchangeContractAddress: string,
//     order: NftOrderV4
//   ) => TypedData;
//   normalizeSignedOrder: (order: SignedOrder) => SignedOrder;
//   normalizeOrder: (order: NftOrderV4) => NftOrderV4;
//   verifyOrderSignature: (
//     order: NftOrderV4,
//     signature: string,
//     chainId: number,
//     exchangeContractAddress: string
//   ) => boolean;
//   checkIfOrderCanBeFilledWithNativeToken: (order: NftOrderV4) => boolean;
//   getAssetsFromOrder: (order: NftOrderV4) => {
//     makerAssets: SwappableAsset[];
//     takerAssets: SwappableAsset[];
//   };
//  }

class NftSwapV4 {
  public provider: BaseProvider;
  public signer: Signer | undefined;
  public chainId: number;
  public exchangeProxy: IZeroEx;

  constructor(provider: BaseProvider, signer: Signer, chainId?: number) {
    this.provider = provider;
    this.signer = signer;
    this.chainId =
      chainId ?? (this.provider._network.chainId as SupportedChainIds);

    this.exchangeProxy = IZeroEx__factory.connect(
      EXCHANGE_PROXY_DEFAULT_ADDRESS_ROPSTEN,
      signer ?? provider
    );
  }

  approveTokenOrNftByAsset = (asset: SwappableAsset, walletAddress: string) => {
    if (!this.signer) {
      throw new Error('Signed not defined');
    }
    return approveAsset(this.exchangeProxy.address, asset, this.signer);
  };

  // // TyPeSaFeTy: Order types supported:
  // // ERC721<>ERC20
  // // ERC1155<>ERC20
  // // Below ensures type-safe for those specific combinations
  // buildOrder2(
  //   makerAsset: UserFacingERC1155AssetDataSerializedNormalizedSingle,
  //   takerAsset: UserFacingERC20AssetDataSerialized
  // ): ERC721OrderStruct;
  // buildOrder2(
  //   makerAsset: UserFacingERC20AssetDataSerialized,
  //   takerAsset: UserFacingERC1155AssetDataSerializedNormalizedSingle
  // ): ERC721OrderStruct;
  // buildOrder2(
  //   makerAsset: UserFacingERC721AssetDataSerialized,
  //   takerAsset: UserFacingERC20AssetDataSerialized
  // ): ERC721OrderStruct;
  // buildOrder2(
  //   makerAsset: UserFacingERC20AssetDataSerialized,
  //   takerAsset: UserFacingERC721AssetDataSerialized
  // ): ERC721OrderStruct;
  // buildOrder2(makerAsset: SwappableAsset, takerAsset: SwappableAsset) {
  //   return this.buildOrder({} as any, {} as any, '') as ERC721OrderStruct;
  // }

  buildOrder = (
    nft:
      | UserFacingERC721AssetDataSerialized
      | UserFacingERC1155AssetDataSerializedNormalizedSingle,
    erc20: UserFacingERC20AssetDataSerialized,
    sellOrBuyNft: 'sell' | 'buy' = 'sell',
    makerWalletAddress: string
  ): NftOrderV4 => {
    const direction =
      sellOrBuyNft === 'sell' ? TradeDirection.SellNFT : TradeDirection.BuyNFT;
    switch (nft.type) {
      case 'ERC721':
        return {
          direction,
          maker: makerWalletAddress,
          taker: NULL_ADDRESS,
          expiry: 1743224013,
          nonce: 6969,
          erc20Token: erc20.tokenAddress,
          erc20TokenAmount: erc20.amount,
          fees: [],
          erc721Token: nft.tokenAddress,
          erc721TokenId: nft.tokenId,
          erc721TokenProperties: [],
        };
      case 'ERC1155':
        return {
          direction,
          maker: makerWalletAddress,
          taker: NULL_ADDRESS,
          expiry: 1743224013,
          nonce: 6969,
          erc20Token: erc20.tokenAddress,
          erc20TokenAmount: erc20.amount,
          fees: [],
          erc1155Token: nft.tokenAddress,
          erc1155TokenAmount: nft.amount ?? '1',
          erc1155TokenId: nft.tokenId,
          erc1155TokenProperties: [],
        };
      default:
        throw new UnexpectedAssetTypeError((nft as any).type ?? 'Unknown');
    }
  };

  signOrder = (orderStruct: NftOrderV4) => {
    // do sign
    if (!this.signer) {
      throw new Error('Signed not defined');
    }
    return signOrderWithEoaWallet(
      orderStruct,
      this.signer as unknown as TypedDataSigner,
      this.chainId,
      this.exchangeProxy.address
    );
  };

  fillOrder = async (order: ERC721OrderStruct, rawSignature: string) => {
    // do fill

    const foo = parseRawSignature(rawSignature);
    const finalSignature: SignatureStruct = {
      signatureType: 2,
      ...foo,
    };

    console.log('final signature', finalSignature);

    const gasPrice = (await this.provider.getGasPrice()).mul(2);

    return this.exchangeProxy.buyERC721(order, finalSignature, '0x', {
      gasLimit: 800000,
      gasPrice: gasPrice,
    });
  };
}

export { NftSwapV4 };
