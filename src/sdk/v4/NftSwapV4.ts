import { Signer, TypedDataSigner } from '@ethersproject/abstract-signer';
import { BaseProvider, TransactionReceipt } from '@ethersproject/providers';
import { ContractTransaction } from 'ethers';
import { IZeroEx, IZeroEx__factory } from '../../contracts';
import type {
  ApprovalStatus,
  BaseNftSwap,
  PayableOverrides,
  SigningOptions,
  TransactionOverrides,
} from '../common/types';
import { UnexpectedAssetTypeError } from '../error';
import {
  approveAsset,
  generateErc1155Order,
  generateErc721Order,
  getApprovalStatus,
  parseRawSignature,
  signOrderWithEoaWallet,
  SwappableAsset,
  TradeDirection,
  UserFacingERC1155AssetDataSerializedNormalizedSingle,
  UserFacingERC20AssetDataSerialized,
  UserFacingERC721AssetDataSerialized,
} from './pure';
import type {
  ApprovalOverrides,
  BuildOrderAdditionalConfig,
  FillOrderOverrides,
  NftOrderV4,
  OrderStatus,
  OrderStructOptionsCommonStrict,
  SignedNftOrderV4,
  SupportedChainIds,
} from './types';

export enum SupportedChainIdsV4 {
  Ropsten = 3,
}

const EXCHANGE_PROXY_DEFAULT_ADDRESS_ROPSTEN =
  '0xdef1c0ded9bec7f1a1670819833240f027b25eff';

export interface INftSwapV4 extends BaseNftSwap {
  signOrder: (
    order: NftOrderV4,
    signerAddress: string,
    signer: Signer,
    signingOptions?: Partial<SigningOptions>
  ) => Promise<SignedNftOrderV4>;
  buildOrder: (
    nft:
      | UserFacingERC721AssetDataSerialized
      | UserFacingERC1155AssetDataSerializedNormalizedSingle,
    erc20: UserFacingERC20AssetDataSerialized,
    sellOrBuyNft: 'sell' | 'buy',
    makerAddress: string,
    userConfig?: Partial<OrderStructOptionsCommonStrict>
  ) => NftOrderV4;
  loadApprovalStatus: (
    asset: SwappableAsset,
    walletAddress: string,
    approvalOverrides?: Partial<ApprovalOverrides>
  ) => Promise<ApprovalStatus>;
  approveTokenOrNftByAsset: (
    asset: SwappableAsset,
    walletAddress: string,
    approvalTransactionOverrides?: Partial<TransactionOverrides>,
    approvalOverrides?: Partial<ApprovalOverrides>
  ) => Promise<ContractTransaction>;
  fillSignedOrder: (
    signedOrder: SignedNftOrderV4,
    fillOrderOverrides?: Partial<FillOrderOverrides>,
    transactionOverrides?: Partial<PayableOverrides>
  ) => Promise<ContractTransaction>;
  awaitTransactionHash: (txHash: string) => Promise<TransactionReceipt>;
  cancelOrder: (order: NftOrderV4) => Promise<ContractTransaction>;
  // waitUntilOrderFilledOrCancelled: (
  //   order: NftOrderV4,
  //   timeoutInMs?: number,
  //   pollOrderStatusFrequencyInMs?: number,
  //   throwIfStatusOtherThanFillableOrFilled?: boolean
  // ) => Promise<OrderStatus | null>;
  getOrderStatus: (order: NftOrderV4) => Promise<OrderStatus>;
  // getOrderHash: (order: NftOrderV4) => string;
  // getTypedData: (
  //   chainId: number,
  //   exchangeContractAddress: string,
  //   order: NftOrderV4
  // ) => TypedData;
  // normalizeSignedOrder: (order: SignedNftOrderV4) => SignedNftOrderV4;
  // normalizeOrder: (order: NftOrderV4) => NftOrderV4;
  // verifyOrderSignature: (
  //   order: NftOrderV4,
  //   signature: string,
  //   chainId: number,
  //   exchangeContractAddress: string
  // ) => boolean;
  // checkIfOrderCanBeFilledWithNativeToken: (order: NftOrderV4) => boolean;
  // getAssetsFromOrder: (order: NftOrderV4) => {
  //   makerAssets: SwappableAsset[];
  //   takerAssets: SwappableAsset[];
  // };
}

class NftSwapV4 implements INftSwapV4 {
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

  loadApprovalStatus = (
    asset: SwappableAsset,
    walletAddress: string,
    approvalOverrides?: Partial<ApprovalOverrides> | undefined
  ) => {
    // TODO(johnrjj) - Fix this to pass thru more args...
    return getApprovalStatus(
      walletAddress,
      approvalOverrides?.exchangeContractAddress ?? this.exchangeProxy.address,
      asset,
      this.provider
    );
  };

  awaitTransactionHash = async (txHash: string) => {
    return this.provider.waitForTransaction(txHash);
  };

  cancelOrder = (order: NftOrderV4): Promise<ContractTransaction> => {
    if ('erc1155Token' in order) {
      return this.exchangeProxy.cancelERC1155Order(order);
    }
    if ('erc721Token' in order) {
      return this.exchangeProxy.cancelERC721Order(order.nonce);
    }
    console.log('unsupported order', order);
    throw new Error('unsupport order');
  };

  getOrderStatus = async (order: NftOrderV4) => {
    if ('erc1155Token' in order) {
      const [
        _erc1155OrderHash,
        erc1155OrderStatus,
        _erc1155OrderAmount,
        _erc1155OrderAmountReminaing,
      ] = await this.exchangeProxy.getERC1155OrderInfo(order);
      return erc1155OrderStatus;
    }
    if ('erc721Token' in order) {
      const erc721OrderStatus = await this.exchangeProxy.getERC721OrderStatus(
        order
      );
      return erc721OrderStatus;
    }
    console.log('unsupported order', order);
    throw new Error('unsupport order');
  };

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
  buildOrderMakerTaker(
    makerAsset: UserFacingERC1155AssetDataSerializedNormalizedSingle,
    takerAsset: UserFacingERC20AssetDataSerialized
  ): NftOrderV4;
  buildOrderMakerTaker(
    makerAsset: UserFacingERC20AssetDataSerialized,
    takerAsset: UserFacingERC1155AssetDataSerializedNormalizedSingle
  ): NftOrderV4;
  buildOrderMakerTaker(
    makerAsset: UserFacingERC721AssetDataSerialized,
    takerAsset: UserFacingERC20AssetDataSerialized
  ): NftOrderV4;
  buildOrderMakerTaker(
    makerAsset: UserFacingERC20AssetDataSerialized,
    takerAsset: UserFacingERC721AssetDataSerialized
  ): NftOrderV4;
  buildOrderMakerTaker(makerAsset: SwappableAsset, takerAsset: SwappableAsset) {
    return this.buildOrder({} as any, {} as any, 'sell', '');
  }

  buildOrder = (
    nft:
      | UserFacingERC721AssetDataSerialized
      | UserFacingERC1155AssetDataSerializedNormalizedSingle,
    erc20: UserFacingERC20AssetDataSerialized,
    sellOrBuyNft: 'sell' | 'buy' = 'sell',
    makerAddress: string,
    userConfig?: Partial<OrderStructOptionsCommonStrict>
  ): NftOrderV4 => {
    const defaultConfig = { chainId: this.chainId, makerAddress: makerAddress };
    const config = { ...defaultConfig, ...userConfig };

    const direction =
      sellOrBuyNft === 'sell' ? TradeDirection.SellNFT : TradeDirection.BuyNFT;
    switch (nft.type) {
      // Build ERC721 order
      case 'ERC721':
        const erc721Order = generateErc721Order(nft, erc20, {
          direction,
          maker: makerAddress,
          ...config,
        });
        return erc721Order;
      // Build ERC1155 order
      case 'ERC1155':
        const erc1155Order = generateErc1155Order(nft, erc20, {
          direction,
          maker: makerAddress,
          ...config,
        });
        return erc1155Order;
      default:
        throw new UnexpectedAssetTypeError((nft as any).type ?? 'Unknown');
    }
  };

  signOrder = async (orderStruct: NftOrderV4): Promise<SignedNftOrderV4> => {
    if (!this.signer) {
      throw new Error('Signed not defined');
    }

    const rawSignature = await signOrderWithEoaWallet(
      orderStruct,
      this.signer as unknown as TypedDataSigner,
      this.chainId,
      this.exchangeProxy.address
    );

    const ecSignature = parseRawSignature(rawSignature);

    const signedOrder = {
      ...orderStruct,
      signature: {
        signatureType: 2,
        r: ecSignature.r,
        s: ecSignature.s,
        v: ecSignature.v,
      },
    };
    return signedOrder;
  };

  fillSignedOrder = async (
    signedOrder: SignedNftOrderV4,
    fillOrderOverrides?: Partial<FillOrderOverrides>,
    transactionOverrides?: Partial<PayableOverrides>
  ) => {
    // do fill
    if ('erc1155Token' in signedOrder) {
      return this.exchangeProxy.buyERC1155(
        signedOrder,
        signedOrder.signature,
        1,
        '0x',
        transactionOverrides ?? {}
      );
    } else if ('erc721Token' in signedOrder) {
      return this.exchangeProxy.buyERC721(
        signedOrder,
        signedOrder.signature,
        '0x',
        transactionOverrides ?? {}
      );
    }
    console.log('unsupported order', signedOrder);
    throw new Error('unsupport signedOrder type');
  };
}

export { NftSwapV4 };
