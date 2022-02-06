import type { Signer, TypedDataSigner } from '@ethersproject/abstract-signer';
import type {
  BaseProvider,
  TransactionReceipt,
} from '@ethersproject/providers';
import type { BigNumberish, ContractTransaction } from 'ethers';
import { Interface } from '@ethersproject/abi';
import invariant from 'tiny-invariant';
import {
  ERC1155__factory,
  ERC721__factory,
  IZeroEx,
  IZeroEx__factory,
} from '../../contracts';
import type {
  ApprovalStatus,
  BaseNftSwap,
  PayableOverrides,
  TransactionOverrides,
} from '../common/types';
import { UnexpectedAssetTypeError } from '../error';
import {
  approveAsset,
  CONTRACT_ORDER_VALIDATOR,
  DIRECTION_MAPPING,
  generateErc1155Order,
  generateErc721Order,
  getApprovalStatus,
  OrderStatus,
  parseRawSignature,
  signOrderWithEoaWallet,
  SupportedChainIds,
  SwappableAsset,
  SwappableNft,
  TradeDirection,
  UserFacingERC1155AssetDataSerializedNormalizedSingle,
  UserFacingERC20AssetDataSerialized,
  UserFacingERC721AssetDataSerialized,
} from './pure';
import type {
  AddressesForChain,
  ApprovalOverrides,
  FillOrderOverrides,
  NftOrderV4,
  NftOrderV4Serialized,
  OrderStructOptionsCommonStrict,
  SignedNftOrderV4,
  SigningOptions,
} from './types';
import {
  ERC1155_TRANSFER_FROM_DATA,
  ERC721_TRANSFER_FROM_DATA,
} from './nft-safe-transfer-from-data';
import addresses from './addresses.json';

export enum SupportedChainIdsV4 {
  Ropsten = 3,
}

export interface INftSwapV4 extends BaseNftSwap {
  signOrder: (
    order: NftOrderV4,
    signerAddress: string,
    signer: Signer,
    signingOptions?: Partial<SigningOptions>
  ) => Promise<SignedNftOrderV4>;
  buildNftAndErc20Order: (
    nft:
      | UserFacingERC721AssetDataSerialized
      | UserFacingERC1155AssetDataSerializedNormalizedSingle,
    erc20: UserFacingERC20AssetDataSerialized,
    sellOrBuyNft: 'sell' | 'buy',
    makerAddress: string,
    userConfig?: Partial<OrderStructOptionsCommonStrict>
  ) => NftOrderV4Serialized;
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

export interface AdditionalSdkConfig {
  zeroExExchangeProxyContractAddress: string;
}

class NftSwapV4 implements INftSwapV4 {
  public provider: BaseProvider;
  public signer: Signer | undefined;
  public chainId: number;
  public exchangeProxy: IZeroEx;
  public exchangeProxyContractAddress: string;

  constructor(
    provider: BaseProvider,
    signer: Signer,
    chainId?: number,
    additionalConfig?: Partial<AdditionalSdkConfig>
  ) {
    this.provider = provider;
    this.signer = signer;
    this.chainId =
      chainId ?? (this.provider._network.chainId as SupportedChainIds);

    const defaultAddressesForChain: AddressesForChain | undefined =
      addresses[this.chainId as SupportedChainIds];

    const zeroExExchangeContractAddress =
      additionalConfig?.zeroExExchangeProxyContractAddress ??
      defaultAddressesForChain?.exchange;

    invariant(
      zeroExExchangeContractAddress,
      '0x V3 Exchange Contract Address not set. Exchange Contract is required to load NftSwap'
    );

    this.exchangeProxyContractAddress = zeroExExchangeContractAddress;

    this.exchangeProxy = IZeroEx__factory.connect(
      zeroExExchangeContractAddress,
      signer ?? provider
    );
  }

  loadApprovalStatus = (
    asset: SwappableAsset,
    walletAddress: string,
    approvalOverrides?: Partial<ApprovalOverrides> | undefined
  ) => {
    // TODO(johnrjj) - Fix to pass thru more args...
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
  buildOrder(
    makerAsset: UserFacingERC1155AssetDataSerializedNormalizedSingle,
    takerAsset: UserFacingERC20AssetDataSerialized,
    makerAddress: string,
    orderConfig?: Partial<OrderStructOptionsCommonStrict>
  ): NftOrderV4Serialized;
  buildOrder(
    makerAsset: UserFacingERC20AssetDataSerialized,
    takerAsset: UserFacingERC1155AssetDataSerializedNormalizedSingle,
    makerAddress: string,
    orderConfig?: Partial<OrderStructOptionsCommonStrict>
  ): NftOrderV4Serialized;
  buildOrder(
    makerAsset: UserFacingERC721AssetDataSerialized,
    takerAsset: UserFacingERC20AssetDataSerialized,
    makerAddress: string,
    orderConfig?: Partial<OrderStructOptionsCommonStrict>
  ): NftOrderV4Serialized;
  buildOrder(
    makerAsset: UserFacingERC20AssetDataSerialized,
    takerAsset: UserFacingERC721AssetDataSerialized,
    makerAddress: string,
    orderConfig?: Partial<OrderStructOptionsCommonStrict>
  ): NftOrderV4Serialized;
  buildOrder(
    makerAsset: SwappableAsset,
    takerAsset: SwappableAsset,
    makerAddress: string,
    orderConfig?: Partial<OrderStructOptionsCommonStrict>
  ) {
    // Basic validation checks
    if (
      (takerAsset.type === 'ERC1155' || takerAsset.type === 'ERC721') &&
      (makerAsset.type === 'ERC1155' || makerAsset.type === 'ERC721')
    ) {
      throw new Error(
        '0x v4 only supports ERC721/ERC1155 <> ERC20. Currently 0x v4 does not support NFT<>NFT swaps, please use 0x v3 SDK for that.'
      );
    }
    if (makerAsset.type === 'ERC20' && takerAsset.type === 'ERC20') {
      throw new Error(
        '0x v4 only supports ERC721/ERC1155 <> ERC20. Currently 0x v4 does not support NFT<>NFT swaps, please use 0x v3 SDK for that.'
      );
    }

    // First determine if the maker or taker is trading the erc20 (to orient the direction of the trade)
    let direction: TradeDirection = TradeDirection.SellNFT;
    if (takerAsset.type === 'ERC20') {
      // NFT is on the maker side (so the maker is selling the NFT)
      direction = TradeDirection.SellNFT;
    }
    if (makerAsset.type === 'ERC20') {
      // NFT is on the taker side (so the maker is buying the NFT)
      direction = TradeDirection.BuyNFT;
    }

    const nft = (
      direction === TradeDirection.BuyNFT ? takerAsset : makerAsset
    ) as SwappableNft;
    const erc20 = (
      direction === TradeDirection.BuyNFT ? makerAsset : takerAsset
    ) as UserFacingERC20AssetDataSerialized;

    return this.buildNftAndErc20Order(
      nft,
      erc20,
      DIRECTION_MAPPING[direction],
      makerAddress,
      orderConfig
    );
  }

  buildCollectionBasedOrder = (
    erc20ToSell: UserFacingERC20AssetDataSerialized,
    nftCollectionToBid: {
      tokenAddress: string;
      type: 'ERC721' | 'ERC1155';
    },
    makerAddress: string
  ): NftOrderV4Serialized => {
    return this.buildNftAndErc20Order(
      {
        ...nftCollectionToBid,
        // Override tokenId to zero, tokenId is ignored when using token properties
        tokenId: '0',
      },
      erc20ToSell,
      'buy',
      makerAddress,
      {
        // Add the token property of 'collection', so this order will be valid for any nft in the collection
        tokenProperties: [CONTRACT_ORDER_VALIDATOR],
      }
    );
  };

  buildNftAndErc20Order = (
    nft: SwappableNft,
    erc20: UserFacingERC20AssetDataSerialized,
    sellOrBuyNft: 'sell' | 'buy' = 'sell',
    makerAddress: string,
    userConfig?: Partial<OrderStructOptionsCommonStrict>
  ): NftOrderV4Serialized => {
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

  signOrder = async (order: NftOrderV4): Promise<SignedNftOrderV4> => {
    if (!this.signer) {
      throw new Error('Signed not defined');
    }

    const rawSignature = await signOrderWithEoaWallet(
      order,
      this.signer as unknown as TypedDataSigner,
      this.chainId,
      this.exchangeProxy.address
    );

    const ecSignature = parseRawSignature(rawSignature);

    const signedOrder = {
      ...order,
      signature: {
        signatureType: 2,
        r: ecSignature.r,
        s: ecSignature.s,
        v: ecSignature.v,
      },
    };
    return signedOrder;
  };

  /**
   * Fill a 'Buy NFT' order (e.g. taker would be selling'their NFT to fill this order) without needing an approval
   * Use case: Users can accept offers/bids for their NFTs without needing to approve their NFT! 🤯
   * @param signedOrder Signed Buy Nft order (e.g. direction = 1)
   * @param tokenId NFT token id that taker of trade will sell
   * @param fillOrderOverrides Trade specific (SDK-level) overrides
   * @param transactionOverrides General transaction overrides from ethers (gasPrice, gasLimit, etc)
   * @returns
   */
  fillBuyNftOrderWithoutApproval = async (
    signedOrder: SignedNftOrderV4,
    tokenId: string,
    fillOrderOverrides?: Partial<FillOrderOverrides>,
    transactionOverrides?: Partial<PayableOverrides>
  ) => {
    if (!this.signer) {
      throw new Error(
        'Signer undefined. Signer must be provided to fill order'
      );
    }
    if (signedOrder.direction !== TradeDirection.BuyNFT) {
      throw new Error(
        'Only filling Buy NFT orders (direction=1) is valid for skipping approvals'
      );
    }

    const signerAddress = await this.signer.getAddress();
    const unwrapWeth =
      fillOrderOverrides?.fillOrderWithNativeTokenInsteadOfWrappedToken ??
      false;

    // Handle ERC721
    if ('erc721Token' in signedOrder) {
      const erc721Contract = ERC721__factory.connect(
        signedOrder.erc721Token,
        this.signer
      );

      const encodingIface = new Interface(ERC721_TRANSFER_FROM_DATA);

      const fragment = encodingIface.getFunction('safeTransferFromErc721Data');
      const data = encodingIface._encodeParams(fragment.inputs, [
        signedOrder,
        signedOrder.signature,
        unwrapWeth,
      ]);

      const transferFromTx = await erc721Contract[
        'safeTransferFrom(address,address,uint256,bytes)'
      ](
        signerAddress,
        this.exchangeProxy.address,
        fillOrderOverrides?.tokenIdToSellForCollectionOrder ?? tokenId,
        data,
        transactionOverrides ?? {}
      );
      return transferFromTx;
    }

    // Handle ERC1155
    if ('erc1155Token' in signedOrder) {
      const erc1155Contract = ERC1155__factory.connect(
        signedOrder.erc1155Token,
        this.signer
      );
      const encodingIface = new Interface(ERC1155_TRANSFER_FROM_DATA);

      const fragment = encodingIface.getFunction('safeTransferFromErc1155Data');
      const data = encodingIface._encodeParams(fragment.inputs, [
        signedOrder,
        signedOrder.signature,
        unwrapWeth,
      ]);

      const transferFromTx = await erc1155Contract.safeTransferFrom(
        signerAddress,
        this.exchangeProxy.address,
        fillOrderOverrides?.tokenIdToSellForCollectionOrder ?? tokenId,
        signedOrder.erc1155TokenAmount ?? '1',
        data,
        transactionOverrides ?? {}
      );
      return transferFromTx;
    }

    // Unknown format (NFT neither ERC721 or ERC1155)
    throw new Error('unknown order type');
  };

  fillSignedCollectionOrder = async (
    signedOrder: SignedNftOrderV4,
    tokenId: BigNumberish,
    fillOrderOverrides?: Partial<FillOrderOverrides>,
    transactionOverrides?: Partial<PayableOverrides>
  ) => {
    return this.fillSignedOrder(
      signedOrder,
      {
        tokenIdToSellForCollectionOrder: tokenId,
        ...fillOrderOverrides,
      },
      transactionOverrides
    );
  };

  fillSignedOrder = async (
    signedOrder: SignedNftOrderV4,
    fillOrderOverrides?: Partial<FillOrderOverrides>,
    transactionOverrides?: Partial<PayableOverrides>
  ) => {
    // do fill
    if ('erc1155Token' in signedOrder) {
      // If maker is selling an NFT, taker wants to 'buy' nft
      if (signedOrder.direction === TradeDirection.SellNFT) {
        return this.exchangeProxy.buyERC1155(
          signedOrder,
          signedOrder.signature,
          1,
          '0x',
          transactionOverrides ?? {}
        );
      } else {
        // TODO(detect if erc20 token is wrapped token, then switch true. if true when not wrapped token, tx will fail)
        let unwrapNativeToken: boolean =
          fillOrderOverrides?.fillOrderWithNativeTokenInsteadOfWrappedToken ??
          false;

        if (signedOrder.erc1155TokenProperties.length > 0) {
          // property based order, let's make sure they've specifically provided a tokenIdToSellForCollectionOrder
          if (
            fillOrderOverrides?.tokenIdToSellForCollectionOrder === undefined
          ) {
            throw new Error(
              'Collection order missing NFT tokenId to fill with. Specify in fillOrderOverrides.tokenIdToSellForCollectionOrder'
            );
          }
        }

        // Otherwise, taker is selling the nft (and buying an ERC20)
        return this.exchangeProxy.sellERC1155(
          signedOrder,
          signedOrder.signature,
          fillOrderOverrides?.tokenIdToSellForCollectionOrder ??
            signedOrder.erc1155TokenId,
          signedOrder.erc20TokenAmount,
          unwrapNativeToken,
          '0x',
          transactionOverrides ?? {}
        );
      }
    } else if ('erc721Token' in signedOrder) {
      // If maker is selling an NFT, taker wants to 'buy' nft
      if (signedOrder.direction === TradeDirection.SellNFT) {
        return this.exchangeProxy.buyERC721(
          signedOrder,
          signedOrder.signature,
          '0x',
          transactionOverrides ?? {}
        );
      } else {
        // TODO(detect if erc20 token is wrapped token, then switch true. if true when not wrapped token, tx will fail)
        let unwrapNativeToken: boolean =
          fillOrderOverrides?.fillOrderWithNativeTokenInsteadOfWrappedToken ??
          false;

        if (signedOrder.erc721TokenProperties.length > 0) {
          // property based order, let's make sure they've specifically provided a tokenIdToSellForCollectionOrder
          if (
            fillOrderOverrides?.tokenIdToSellForCollectionOrder === undefined
          ) {
            throw new Error(
              'Collection order missing NFT tokenId to fill with. Specify in fillOrderOverrides.tokenIdToSellForCollectionOrder'
            );
          }
        }

        // Otherwise, taker is selling the nft (and buying an ERC20)
        return this.exchangeProxy.sellERC721(
          signedOrder,
          signedOrder.signature,
          fillOrderOverrides?.tokenIdToSellForCollectionOrder ??
            signedOrder.erc721TokenId,
          unwrapNativeToken,
          '0x'
        );
      }
    }
    console.log('unsupported order', signedOrder);
    throw new Error('unsupport signedOrder type');
  };
}

export { NftSwapV4 };
