import type { Signer, TypedDataSigner } from '@ethersproject/abstract-signer';
import type {
  BaseProvider,
  TransactionReceipt,
} from '@ethersproject/providers';
import type { BigNumberish, ContractTransaction } from 'ethers';
import { Interface } from '@ethersproject/abi';
import invariant from 'tiny-invariant';
import warning from 'tiny-warning';
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
  generateErc1155Order,
  generateErc721Order,
  getApprovalStatus,
  parseRawSignature,
  signOrderWithEoaWallet,
} from './pure';
import type {
  AddressesForChainV4,
  ApprovalOverrides,
  FillOrderOverrides,
  NftOrderV4,
  NftOrderV4Serialized,
  OrderStructOptionsCommonStrict,
  SignedNftOrderV4,
  SigningOptionsV4,
  SwappableAssetV4,
  UserFacingERC1155AssetDataSerializedV4,
  UserFacingERC20AssetDataSerializedV4,
  UserFacingERC721AssetDataSerializedV4,
} from './types';
import {
  ERC1155_TRANSFER_FROM_DATA,
  ERC721_TRANSFER_FROM_DATA,
} from './nft-safe-transfer-from-data';
import addresses from './addresses.json';
import {
  searchOrderbook,
  postOrderToOrderbook,
  PostOrderResponsePayload,
  SearchOrdersParams,
  ORDERBOOK_API_ROOT_URL_PRODUCTION,
} from './orderbook';
import { DIRECTION_MAPPING, OrderStatusV4, TradeDirection } from './enums';
import { CONTRACT_ORDER_VALIDATOR } from './properties';
import { getWrappedNativeToken } from '../../utils/addresses';
import { ETH_ADDRESS_AS_ERC20 } from './constants';

export enum SupportedChainIdsV4 {
  Mainnet = 1,
  Ropsten = 3,
  Ganache = 1337,
  Polygon = 137,
  BSC = 56,
  Optimism = 10,
  Fantom = 250,
  Celo = 42220,
  Avalance = 43114,
  // Arbitrum = 42161, // soon
}

export const SupportedChainsForV4OrderbookStatusMonitoring = [
  SupportedChainIdsV4.Ropsten,
  SupportedChainIdsV4.Polygon,
  SupportedChainIdsV4.Mainnet,
  SupportedChainIdsV4.Optimism,
  // SupportedChainIdsV4.Arbitrum,
];

export interface INftSwapV4 extends BaseNftSwap {
  signOrder: (
    order: NftOrderV4,
    signerAddress: string,
    signer: Signer,
    signingOptions?: Partial<SigningOptionsV4>
  ) => Promise<SignedNftOrderV4>;
  buildNftAndErc20Order: (
    nft:
      | UserFacingERC721AssetDataSerializedV4
      | UserFacingERC1155AssetDataSerializedV4,
    erc20: UserFacingERC20AssetDataSerializedV4,
    sellOrBuyNft: 'sell' | 'buy',
    makerAddress: string,
    userConfig?: Partial<OrderStructOptionsCommonStrict>
  ) => NftOrderV4Serialized;
  loadApprovalStatus: (
    asset: SwappableAssetV4,
    walletAddress: string,
    approvalOverrides?: Partial<ApprovalOverrides>
  ) => Promise<ApprovalStatus>;
  approveTokenOrNftByAsset: (
    asset: SwappableAssetV4,
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
  cancelOrder: (
    nonce: BigNumberish,
    orderType: 'ERC721' | 'ERC1155' // Can we make this optional
  ) => Promise<ContractTransaction>;
  matchOrders: (
    sellOrder: SignedNftOrderV4,
    buyOrder: SignedNftOrderV4,
    transactionOverrides?: Partial<PayableOverrides>
  ) => Promise<ContractTransaction>;
  // waitUntilOrderFilledOrCancelled: (
  //   order: NftOrderV4,
  //   timeoutInMs?: number,
  //   pollOrderStatusFrequencyInMs?: number,
  //   throwIfStatusOtherThanFillableOrFilled?: boolean
  // ) => Promise<OrderStatus | null>;
  getOrderStatus: (order: NftOrderV4) => Promise<OrderStatusV4>;
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
  orderbookRootUrl: string;
}

export const FAKE_ETH_ADDRESS = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

class NftSwapV4 implements INftSwapV4 {
  public provider: BaseProvider;
  public signer: Signer | undefined;
  public chainId: number;
  public exchangeProxy: IZeroEx;
  public exchangeProxyContractAddress: string;

  public orderbookRootUrl: string;

  constructor(
    provider: BaseProvider,
    signer: Signer,
    chainId?: number,
    additionalConfig?: Partial<AdditionalSdkConfig>
  ) {
    this.provider = provider;
    this.signer = signer;
    this.chainId =
      chainId ?? (this.provider._network.chainId as SupportedChainIdsV4);

    const defaultAddressesForChain: AddressesForChainV4 | undefined =
      addresses[this.chainId as SupportedChainIdsV4];

    const zeroExExchangeContractAddress =
      additionalConfig?.zeroExExchangeProxyContractAddress ??
      defaultAddressesForChain?.exchange;

    invariant(
      zeroExExchangeContractAddress,
      '0x V4 Exchange Contract Address not set. Exchange Contract is required to load NftSwap'
    );

    this.exchangeProxyContractAddress = zeroExExchangeContractAddress;

    this.orderbookRootUrl =
      additionalConfig?.orderbookRootUrl ?? ORDERBOOK_API_ROOT_URL_PRODUCTION;

    this.exchangeProxy = IZeroEx__factory.connect(
      zeroExExchangeContractAddress,
      signer ?? provider
    );
  }

  loadApprovalStatus(
    asset: SwappableAssetV4,
    walletAddress: string,
    approvalOverrides?: Partial<ApprovalOverrides> | undefined
  ): Promise<ApprovalStatus> {
    // TODO(johnrjj) - Fix to pass thru more args...
    return getApprovalStatus(
      walletAddress,
      approvalOverrides?.exchangeContractAddress ?? this.exchangeProxy.address,
      asset,
      this.provider
    );
  }

  awaitTransactionHash = async (txHash: string) => {
    return this.provider.waitForTransaction(txHash);
  };

  cancelOrder = (
    nonce: BigNumberish,
    orderType: 'ERC721' | 'ERC1155'
  ): Promise<ContractTransaction> => {
    if (orderType === 'ERC1155') {
      return this.exchangeProxy.cancelERC1155Order(nonce);
    }
    if (orderType === 'ERC721') {
      return this.exchangeProxy.cancelERC721Order(nonce);
    }
    console.log('unsupported order', orderType);
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

  approveTokenOrNftByAsset = (
    asset: SwappableAssetV4,
    _walletAddress: string, // Remove in next release
    approvalTransactionOverrides?: Partial<TransactionOverrides>,
    otherOverrides?: Partial<ApprovalOverrides>
  ) => {
    const signedToUse = otherOverrides?.signer ?? this.signer;
    if (!signedToUse) {
      throw new Error('Signed not defined');
    }
    return approveAsset(
      this.exchangeProxy.address,
      asset,
      signedToUse,
      {
        ...approvalTransactionOverrides,
      },
      otherOverrides?.approve ?? true
    );
  };

  // // TyPeSaFeTy: Order types supported:
  // // ERC721<>ERC20
  // // ERC1155<>ERC20
  // // Below ensures type-safe for those specific combinations
  buildOrder(
    makerAsset: UserFacingERC1155AssetDataSerializedV4,
    takerAsset: UserFacingERC20AssetDataSerializedV4,
    makerAddress: string,
    orderConfig?: Partial<OrderStructOptionsCommonStrict>
  ): NftOrderV4Serialized;
  buildOrder(
    makerAsset: UserFacingERC20AssetDataSerializedV4,
    takerAsset: UserFacingERC1155AssetDataSerializedV4,
    makerAddress: string,
    orderConfig?: Partial<OrderStructOptionsCommonStrict>
  ): NftOrderV4Serialized;
  buildOrder(
    makerAsset: UserFacingERC721AssetDataSerializedV4,
    takerAsset: UserFacingERC20AssetDataSerializedV4,
    makerAddress: string,
    orderConfig?: Partial<OrderStructOptionsCommonStrict>
  ): NftOrderV4Serialized;
  buildOrder(
    makerAsset: UserFacingERC20AssetDataSerializedV4,
    takerAsset: UserFacingERC721AssetDataSerializedV4,
    makerAddress: string,
    orderConfig?: Partial<OrderStructOptionsCommonStrict>
  ): NftOrderV4Serialized;
  buildOrder(
    makerAsset: SwappableAssetV4,
    takerAsset: SwappableAssetV4,
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
    ) as SwappableAssetV4;
    const erc20 = (
      direction === TradeDirection.BuyNFT ? makerAsset : takerAsset
    ) as UserFacingERC20AssetDataSerializedV4;

    return this.buildNftAndErc20Order(
      nft,
      erc20,
      DIRECTION_MAPPING[direction],
      makerAddress,
      orderConfig
    );
  }

  getWrappedTokenAddress = (chainId: number | string) => {
    return getWrappedNativeToken(chainId);
  };

  buildCollectionBasedOrder = (
    erc20ToSell: UserFacingERC20AssetDataSerializedV4,
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
    nft: SwappableAssetV4,
    erc20: UserFacingERC20AssetDataSerializedV4,
    sellOrBuyNft: 'sell' | 'buy' = 'sell',
    makerAddress: string,
    userConfig?: Partial<OrderStructOptionsCommonStrict>
  ): NftOrderV4Serialized => {
    const defaultConfig = { chainId: this.chainId, makerAddress: makerAddress };
    const config = { ...defaultConfig, ...userConfig };

    const direction =
      sellOrBuyNft === 'sell' ? TradeDirection.SellNFT : TradeDirection.BuyNFT;

    // Validate that a bid does not use ETH.
    if (direction === TradeDirection.BuyNFT) {
      if (erc20.tokenAddress.toLowerCase() === FAKE_ETH_ADDRESS) {
        throw new Error(
          'NFT Bids cannot use the native token (e.g. ETH). Please use the wrapped native token (e.g. WETH)'
        );
      }
    }

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
      {
        ...transactionOverrides,
      }
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
        const needsEthAttached =
          signedOrder.erc20Token.toLowerCase() === ETH_ADDRESS_AS_ERC20;

        return this.exchangeProxy.buyERC1155(
          signedOrder,
          signedOrder.signature,
          signedOrder.erc1155TokenAmount,
          '0x',
          {
            value: needsEthAttached ? signedOrder.erc20TokenAmount : undefined,
            ...transactionOverrides,
          }
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
          signedOrder.erc1155TokenAmount,
          unwrapNativeToken,
          '0x',
          {
            ...transactionOverrides,
          }
        );
      }
    } else if ('erc721Token' in signedOrder) {
      // If maker is selling an NFT, taker wants to 'buy' nft

      if (signedOrder.direction === TradeDirection.SellNFT) {
        const needsEthAttached =
          signedOrder.erc20Token.toLowerCase() === ETH_ADDRESS_AS_ERC20;

        return this.exchangeProxy.buyERC721(
          signedOrder,
          signedOrder.signature,
          '0x',
          {
            value: needsEthAttached ? signedOrder.erc20TokenAmount : undefined,
            ...transactionOverrides,
          }
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
          '0x',
          {
            ...transactionOverrides,
          }
        );
      }
    }
    console.log('unsupported order', signedOrder);
    throw new Error('unsupport signedOrder type');
  };

  postOrder = (
    signedOrder: SignedNftOrderV4,
    chainId: string,
    metadata?: Record<string, string>
  ): Promise<PostOrderResponsePayload> => {
    const supportsMonitoring =
      SupportedChainsForV4OrderbookStatusMonitoring.includes(parseInt(chainId));
    warning(
      supportsMonitoring,
      `Chain ${chainId} does not support live orderbook status monitoring. Orders can be posted to be persisted, but status wont be monitored (e.g. updating status on a fill, cancel, or expiry.)`
    );
    return postOrderToOrderbook(signedOrder, chainId, metadata, {
      rootUrl: this.orderbookRootUrl,
    });
  };

  getOrders = async (filters?: Partial<SearchOrdersParams>) => {
    const orders = await searchOrderbook(filters, {
      rootUrl: this.orderbookRootUrl,
    });
    return orders;
  };

  // NOTE(johnrjj)- Should these types be SignedERC721OrderStruct directly since only 712 is supported for matching
  matchOrders = async (
    sellOrder: SignedNftOrderV4,
    buyOrder: SignedNftOrderV4,
    transactionOverrides?: Partial<PayableOverrides>
  ) => {
    if ('erc721Token' in sellOrder && 'erc721Token' in buyOrder) {
      // TODO(johnrjj) - More validation here before we match on-chain
      const contractTx = await this.exchangeProxy.matchERC721Orders(
        sellOrder,
        buyOrder,
        sellOrder.signature,
        buyOrder.signature,
        transactionOverrides ?? {}
      );
      return contractTx;
    }

    throw new Error(
      'Only ERC721 Orders are currently supported for matching. Please ensure both the sellOrder and buyOrder are ERC721 orders'
    );
  };

  getTakerAsset = (order: NftOrderV4): SwappableAssetV4 => {
    // return {
    //   tokenAddress: '',
    //   tokenId: ''
    // }
  };

  getMakerAsset = (order: NftOrderV4): SwappableAssetV4 => {
    // return {
    //   tokenAddress: '',
    //   tokenId: ''
    // }
  };

  // todo: consolidate
  // todo: use these to power validation for the api
  checkOrderCanBeFilledMakerSide = (order: NftOrderV4) => {};

  checkOrderCanBeFilledTakerSide = (
    order: NftOrderV4,
    override?: VerifyOrderOptionsOverrides
  ) => {
    const shouldLoadApprovalStatus = override?.verifyApproval ?? true;
    const shouldLoadBalance = override?.verifyBalance ?? true;

    const direction = parseInt(order.direction.toString(10));
    if (direction === TradeDirection.SellNFT) {
      if ('erc721Token' in order) {
        this.loadApprovalStatus();

        const { erc721Token, erc721TokenId } = order;

        // TODO(johnrjj) - More validation here before we match on-chain
      } else if ('erc1155Token' in order) {
        const { erc1155TokenAmount, erc1155Token, erc1155TokenId } = order;
      }
    } else if (direction === TradeDirection.BuyNFT) {
    }
  };
}

interface VerifyOrderOptionsOverrides {
  verifyApproval?: boolean;
  verifyBalance: boolean;
}

export { NftSwapV4 };
