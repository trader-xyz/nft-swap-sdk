import type { Signer, TypedDataSigner } from '@ethersproject/abstract-signer';
import type {
  BaseProvider,
  TransactionReceipt,
} from '@ethersproject/providers';
import { BigNumber, BigNumberish, ContractTransaction } from 'ethers';
import { Interface } from '@ethersproject/abi';
import invariant from 'tiny-invariant';
import warning from 'tiny-warning';
import {
  ERC1155__factory,
  ERC721__factory,
  ERC20__factory,
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
  DEFAULT_APP_ID,
  generateErc1155Order,
  generateErc721Order,
  getApprovalStatus,
  parseRawSignature,
  signOrderWithEoaWallet,
  verifyAppIdOrThrow,
} from './pure';
import type {
  AddressesForChainV4,
  ApprovalOverrides,
  ERC721OrderStruct,
  FillOrderOverrides,
  NftOrderV4,
  NftOrderV4Serialized,
  OrderStructOptionsCommonStrict,
  SignedERC1155OrderStruct,
  SignedERC1155OrderStructSerialized,
  SignedERC721OrderStruct,
  SignedERC721OrderStructSerialized,
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
  SearchOrdersResponsePayload,
} from './orderbook';
import { getWrappedNativeToken } from '../../utils/addresses';
import { DIRECTION_MAPPING, OrderStatusV4, TradeDirection } from './enums';
import { CONTRACT_ORDER_VALIDATOR } from './properties';
import { ETH_ADDRESS_AS_ERC20 } from './constants';
import { ZERO_AMOUNT } from '../../utils/eth';
import { arrayify } from '@ethersproject/bytes';

export enum SupportedChainIdsV4 {
  Mainnet = 1,
  Ropsten = 3,
  Goerli = 5,
  Ubiq = 8,
  Ganache = 1337,
  Polygon = 137,
  PolygonMumbai = 80001,
  BSC = 56,
  Optimism = 10,
  Fantom = 250,
  Celo = 42220,
  Avalance = 43114,
  // Arbitrum = 42161, // soon
}

export const SupportedChainsForV4OrderbookStatusMonitoring = [
  SupportedChainIdsV4.Polygon,
  SupportedChainIdsV4.PolygonMumbai,
  SupportedChainIdsV4.Mainnet,
  SupportedChainIdsV4.Optimism,
  SupportedChainIdsV4.Goerli,
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
  // Identify your app fills with distinct integer
  appId: string;
  // Custom zeroex proxy contract address (defaults to the canonical contracts deployed by 0x Labs core team)
  zeroExExchangeProxyContractAddress: string;
  // Custom orderbook url. Defaults to using Trader.xyz's multi-chain open orderbook
  orderbookRootUrl: string;
}

class NftSwapV4 implements INftSwapV4 {
  // RPC provider
  public provider: BaseProvider;
  // Wallet signer
  public signer: Signer | undefined;
  // Chain Id for this instance of NftSwapV4.
  // To switch chains, instantiate a new version of NftSWapV4 with the updated chain id.
  public chainId: number;

  // ZeroEx ExchangeProxy contract address to reference
  public exchangeProxyContractAddress: string;
  // Generated ZeroEx ExchangeProxy contracts
  public exchangeProxy: IZeroEx;

  // Unique identifier for app. Must be a positive integer between 1 and 2**128
  public appId: string;

  // Orderbook URL
  public orderbookRootUrl: string;

  constructor(
    provider: BaseProvider,
    signer: Signer,
    chainId?: number | string,
    additionalConfig?: Partial<AdditionalSdkConfig>
  ) {
    this.provider = provider;
    this.signer = signer;
    this.chainId = chainId
      ? parseInt(chainId.toString(10), 10)
      : (this.provider._network.chainId as SupportedChainIdsV4);

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

    this.appId = additionalConfig?.appId ?? DEFAULT_APP_ID;
    verifyAppIdOrThrow(this.appId);

    this.exchangeProxy = IZeroEx__factory.connect(
      zeroExExchangeContractAddress,
      signer ?? provider
    );
  }

  /**
   * Checks if an asset is approved for trading with 0x v4
   * If an asset is not approved, call approveTokenOrNftByAsset to approve.
   * @param asset A tradeable asset (ERC20, ERC721, or ERC1155)
   * @param walletAddress The wallet address that owns the asset
   * @param approvalOverrides Optional config options for approving
   * @returns
   */
  loadApprovalStatus = (
    asset: SwappableAssetV4,
    walletAddress: string,
    approvalOverrides?: Partial<ApprovalOverrides> | undefined
  ): Promise<ApprovalStatus> => {
    // TODO(johnrjj) - Fix to pass thru more args...
    return getApprovalStatus(
      walletAddress,
      approvalOverrides?.exchangeContractAddress ?? this.exchangeProxy.address,
      asset,
      this.provider
    );
  };

  /**
   * Convenience function to await a transaction hash.
   * During a fill order call, you can get the pending transaction hash and await it manually via this method.
   * @param txHash Transaction hash to await
   * @returns
   */
  awaitTransactionHash = async (txHash: string) => {
    return this.provider.waitForTransaction(txHash);
  };

  /**
   * Cancels an 0x v4 order. Once cancelled, the order no longer fillable.
   * Requires a signer
   * @param nonce
   * @param orderType
   * @returns Transaciton Receipt
   */
  cancelOrder = (
    nonce: BigNumberish,
    orderType: 'ERC721' | 'ERC1155'
  ): Promise<ContractTransaction> => {
    if (orderType === 'ERC721') {
      return this.exchangeProxy.cancelERC721Order(nonce);
    }
    if (orderType === 'ERC1155') {
      return this.exchangeProxy.cancelERC1155Order(nonce);
    }
    console.log('unsupported order', orderType);
    throw new Error('unsupport order');
  };

  /**
   * Batch fill NFT sell orders
   * Can be used by taker to fill multiple NFT sell orders atomically.
   * E.g. A taker has a shopping cart full of NFTs to buy, can call this method to fill them all.
   * Requires a valid signer to execute transaction
   * @param signedOrders Signed 0x NFT sell orders
   * @param revertIfIncomplete Revert if we don't fill _all_ orders (defaults to false)
   * @param transactionOverrides Ethers transaciton overrides
   * @returns
   */
  batchBuyNfts = (
    signedOrders: Array<SignedNftOrderV4>,
    revertIfIncomplete: boolean = false,
    transactionOverrides?: PayableOverrides
  ) => {
    const allSellOrders = signedOrders.every((signedOrder) => {
      if (signedOrder.direction === 0) {
        return true;
      }
      return false;
    });

    invariant(
      allSellOrders,
      `batchBuyNfts: All orders must be of type sell order (order direction == 0)`
    );

    const allErc721 = signedOrders.every((signedOrder) => {
      if ('erc721Token' in signedOrder) {
        return true;
      }
      return false;
    });

    const allErc1155 = signedOrders.every((signedOrder) => {
      if ('erc1155Token' in signedOrder) {
        return true;
      }
      return false;
    });

    const eitherAllErc721OrErc1155Orders = allErc721 || allErc1155;

    invariant(
      eitherAllErc721OrErc1155Orders,
      `Batch buy is only available for tokens of the same ERC type.`
    );

    if (allErc721) {
      const erc721SignedOrders: SignedERC721OrderStruct[] =
        signedOrders as SignedERC721OrderStruct[];
      return this.exchangeProxy.batchBuyERC721s(
        erc721SignedOrders,
        erc721SignedOrders.map((so) => so.signature),
        erc721SignedOrders.map((_) => '0x'),
        revertIfIncomplete,
        {
          ...transactionOverrides,
        }
      );
    } else if (allErc1155) {
      const erc1155SignedOrders: SignedERC1155OrderStruct[] =
        signedOrders as SignedERC1155OrderStruct[];
      return this.exchangeProxy.batchBuyERC1155s(
        erc1155SignedOrders,
        erc1155SignedOrders.map((so) => so.signature),
        erc1155SignedOrders.map((so) => so.erc1155TokenAmount),
        erc1155SignedOrders.map((_) => '0x'),
        revertIfIncomplete,
        {
          ...transactionOverrides,
        }
      );
    } else {
      throw Error('batchBuyNfts: Incompatible state');
    }
  };

  /**
   * Derives order hash from order (currently requires a provider to derive)
   * @param order A 0x v4 order (signed or unsigned)
   * @returns Order hash
   */
  getOrderHash = (order: NftOrderV4Serialized): Promise<string> => {
    if ('erc721Token' in order) {
      return this.exchangeProxy.getERC721OrderHash(order);
    }
    if ('erc1155Token' in order) {
      return this.exchangeProxy.getERC1155OrderHash(order);
    }
    throw new Error('unsupport order');
  };

  /**
   * Looks up the order status for a given 0x v4 order.
   * (Available states for an order are 'filled', 'expired', )
   * @param order An 0x v4 NFT order
   * @returns A number the corresponds to the enum OrderStatusV4
   * Valid order states:
   * Invalid = 0
   * Fillable = 1,
   * Unfillable = 2,
   * Expired = 3,
   */
  getOrderStatus = async (order: NftOrderV4): Promise<number> => {
    if ('erc721Token' in order) {
      const erc721OrderStatus = await this.exchangeProxy.getERC721OrderStatus(
        order
      );
      return erc721OrderStatus;
    }
    if ('erc1155Token' in order) {
      const [
        _erc1155OrderHash,
        erc1155OrderStatus,
        _erc1155OrderAmount,
        _erc1155OrderAmountReminaing,
      ] = await this.exchangeProxy.getERC1155OrderInfo(order);
      return erc1155OrderStatus;
    }
    console.log('unsupported order', order);
    throw new Error('unsupport order');
  };

  /**
   * Convenience function to approve an asset (ERC20, ERC721, or ERC1155) for trading with 0x v4
   * @param asset
   * @param _walletAddress
   * @param approvalTransactionOverrides
   * @param otherOverrides
   * @returns An ethers contract transaction
   */
  approveTokenOrNftByAsset = (
    asset: SwappableAssetV4,
    _walletAddress: string, // Remove in next release
    approvalTransactionOverrides?: Partial<TransactionOverrides>,
    otherOverrides?: Partial<ApprovalOverrides>
  ): Promise<ContractTransaction> => {
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
      otherOverrides
    );
  };

  // // TyPeSaFeTy: Order types supported:
  // // ERC721<>ERC20
  // // ERC1155<>ERC20
  // // Below ensures type-safe for those specific combinations
  /**
   * Builds a 0x order given two assets (either NFT<>ERC20 or ERC20<>NFT)
   * @param makerAsset An asset (ERC20, ERC721, or ERC1155) the user has
   * @param takerAsset An asset (ERC20, ERC721, or ERC1155) the user wants
   * @param makerAddress The address of the wallet creating the order
   * @param orderConfig Various order configuration options (e.g. expiration, nonce)
   */
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
    const defaultConfig = {
      chainId: this.chainId,
      makerAddress: makerAddress,
      appId: this.appId,
    };
    const config = { ...defaultConfig, ...userConfig };

    const direction =
      sellOrBuyNft === 'sell' ? TradeDirection.SellNFT : TradeDirection.BuyNFT;

    // Validate that a bid does not use ETH.
    if (direction === TradeDirection.BuyNFT) {
      if (erc20.tokenAddress.toLowerCase() === ETH_ADDRESS_AS_ERC20) {
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

  /**
   * Signs a 0x order. Requires a signer (e.g. wallet or private key)
   * Once signed, the order becomes fillable (as long as the order is valid)
   * 0x orders require a signature to fill.
   * @param order A 0x v4 order
   * @returns A signed 0x v4 order
   */
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

  /**
   * Fills a 'collection'-based order (e.g. a bid for any nft belonging to a particular collection)
   * @param signedOrder A 0x signed collection order
   * @param tokenId The token id to fill for the collection order
   * @param fillOrderOverrides Various fill options
   * @param transactionOverrides Ethers transaction overrides
   * @returns
   */
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

  isErc20NativeToken = (order: NftOrderV4): boolean => {
    return order.erc20Token.toLowerCase() === ETH_ADDRESS_AS_ERC20;
  };

  /**
   * Fills a signed order
   * @param signedOrder A signed 0x v4 order
   * @param fillOrderOverrides Optional configuration on possible ways to fill the order
   * @param transactionOverrides Ethers transaction overrides (e.g. gas price)
   * @returns
   */
  fillSignedOrder = async (
    signedOrder: SignedNftOrderV4,
    fillOrderOverrides?: Partial<FillOrderOverrides>,
    transactionOverrides?: Partial<PayableOverrides>
  ) => {
    // Only Sell orders can be filled with ETH
    const canOrderTypeBeFilledWithNativeToken =
      signedOrder.direction === TradeDirection.SellNFT;
    // Is ERC20 being traded the native token
    const isNativeToken = this.isErc20NativeToken(signedOrder);
    const needsEthAttached =
      isNativeToken && canOrderTypeBeFilledWithNativeToken;
    const erc20TotalAmount = this.getErc20TotalIncludingFees(signedOrder);

    // do fill
    if ('erc1155Token' in signedOrder) {
      // If maker is selling an NFT, taker wants to 'buy' nft
      if (signedOrder.direction === TradeDirection.SellNFT) {
        return this.exchangeProxy.buyERC1155(
          signedOrder,
          signedOrder.signature,
          signedOrder.erc1155TokenAmount,
          '0x',
          {
            // If we're filling an order with ETH, be sure to include the value with fees added
            value: needsEthAttached ? erc20TotalAmount : undefined,
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
        return this.exchangeProxy.buyERC721(
          signedOrder,
          signedOrder.signature,
          '0x',
          {
            // If we're filling an order with ETH, be sure to include the value with fees added
            value: needsEthAttached ? erc20TotalAmount : undefined,
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

  /**
   * Posts a 0x order to the Trader.xyz NFT open orderbook
   * @param signedOrder A valid 0x v4 signed order
   * @param chainId The chain id (e.g. '1' for mainnet, or '137' for polygon mainnet)
   * @param metadata An optional record object (key: string, value: string) that will be stored alongside the order in the orderbook
   * This is helpful for webapp builders, as they can save app-level order metadata
   * (e.g. maybe save a 'bidMessage' alongside the order, or extra image metadata)
   * @returns
   */
  postOrder = (
    signedOrder: SignedNftOrderV4,
    chainId: string | number,
    metadata?: Record<string, string>
  ): Promise<PostOrderResponsePayload> => {
    const parsedChainId = parseInt(chainId.toString(10), 10);
    const supportsMonitoring =
      SupportedChainsForV4OrderbookStatusMonitoring.includes(parsedChainId);
    warning(
      supportsMonitoring,
      `Chain ${chainId} does not support live orderbook status monitoring. Orders can be posted to be persisted, but status wont be monitored (e.g. updating status on a fill, cancel, or expiry.)`
    );
    return postOrderToOrderbook(signedOrder, parsedChainId, metadata, {
      rootUrl: this.orderbookRootUrl,
    });
  };

  /**
   * Gets orders from the Trader.xyz Open NFT Orderbook
   * By default will find all order, active orders.
   * @param filters Various options to filter an order search
   * @returns An object that includes `orders` key with an array of orders that meet the search critera
   */
  getOrders = async (
    filters?: Partial<SearchOrdersParams>
  ): Promise<SearchOrdersResponsePayload> => {
    const orders = await searchOrderbook(filters, {
      rootUrl: this.orderbookRootUrl,
    });
    return orders;
  };

  /**
   *
   * @param sellOrder ERC721 Order to sell an NFT
   * @param buyOrder ERC721 Order to buy an NFT
   * @param transactionOverrides Ethers transaction overrides
   * @returns
   */
  matchOrders = async (
    // NOTE(johnrjj)- Should these types be SignedERC721OrderStruct directly since only 712 is supported for matching
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

  getMakerAsset = (order: NftOrderV4): SwappableAssetV4 => {
    // Buy NFT - So maker asset is an ERC20
    if (order.direction.toString(10) === TradeDirection.BuyNFT.toString()) {
      return {
        tokenAddress: order.erc20Token,
        amount: order.erc20TokenAmount.toString(10),
        type: 'ERC20' as const,
      };
    } else if (
      order.direction.toString(10) === TradeDirection.SellNFT.toString()
    ) {
      // Sell NFT - So maker asset is an NFT (either ERC721 or ERC1155)
      if ('erc721Token' in order) {
        return {
          tokenAddress: order.erc721Token,
          tokenId: order.erc721TokenId.toString(10),
          type: 'ERC721' as const,
        };
      } else if ('erc1155Token' in order) {
        return {
          tokenAddress: order.erc1155Token,
          tokenId: order.erc1155TokenId.toString(10),
          amount: order.erc1155TokenAmount.toString(10),
          type: 'ERC1155' as const,
        };
      }
    }
    throw new Error(`Unknown order direction ${order.direction}`);
  };

  getTakerAsset = (order: NftOrderV4): SwappableAssetV4 => {
    // Buy NFT - So taker asset is an NFT [ERC721 or ERC1155] (because the taker is the NFT owner 'accepting' a buy order)
    if (order.direction.toString(10) === TradeDirection.BuyNFT.toString()) {
      if ('erc721Token' in order) {
        return {
          tokenAddress: order.erc721Token,
          tokenId: order.erc721TokenId.toString(10),
          type: 'ERC721' as const,
        };
      } else if ('erc1155Token' in order) {
        return {
          tokenAddress: order.erc1155Token,
          tokenId: order.erc1155TokenId.toString(10),
          amount: order.erc1155TokenAmount.toString(10),
          type: 'ERC1155' as const,
        };
      }
    } else if (
      order.direction.toString(10) === TradeDirection.SellNFT.toString()
    ) {
      // Sell NFT - So taker asset is an ERC20 -- because the taker here is 'buying' the sell NFT order
      return {
        tokenAddress: order.erc20Token,
        amount: order.erc20TokenAmount.toString(10),
        type: 'ERC20' as const,
      };
    }
    throw new Error(`Unknown order direction ${order.direction}`);
  };

  /**
   * Validate an order signature given a signed order
   * Throws if invalid
   * @param signedOrder A 0x v4 signed order to validate signature for
   * @returns
   */
  validateSignature = async (
    signedOrder: SignedNftOrderV4
  ): Promise<boolean> => {
    if ('erc721Token' in signedOrder) {
      // Validate functions on-chain return void if successful
      await this.exchangeProxy.validateERC721OrderSignature(
        signedOrder,
        signedOrder.signature
      );
      return true;
    } else if ('erc1155Token' in signedOrder) {
      // Validate functions on-chain return void if successful
      await this.exchangeProxy.validateERC1155OrderSignature(
        signedOrder,
        signedOrder.signature
      );
      return true;
    } else {
      throw new Error('Unknown order type (not ERC721 or ERC1155)');
    }
  };

  /**
   * Fetches the balance of an asset for a given wallet address
   * @param asset A Tradeable asset -- An ERC20, ERC721, or ERC1155
   * @param walletAddress A wallet address ('0x1234...6789')
   * @param provider Optional, defaults to the class's provider but can be overridden
   * @returns A BigNumber balance (e.g. 1 or 0 for ERC721s. ERC20 and ERC1155s can have balances greater than 1)
   */
  fetchBalanceForAsset = async (
    asset: SwappableAssetV4,
    walletAddress: string,
    provider: BaseProvider = this.provider
  ): Promise<BigNumber> => {
    switch (asset.type) {
      case 'ERC20':
        const erc20 = ERC20__factory.connect(asset.tokenAddress, provider);
        return erc20.balanceOf(walletAddress);
      case 'ERC721':
        const erc721 = ERC721__factory.connect(asset.tokenAddress, provider);
        const owner = await erc721.ownerOf(asset.tokenId);
        if (owner.toLowerCase() === walletAddress.toLowerCase()) {
          return BigNumber.from(1);
        }
        return BigNumber.from(0);
      case 'ERC1155':
        const erc1155 = ERC1155__factory.connect(asset.tokenAddress, provider);
        return erc1155.balanceOf(walletAddress, asset.tokenId);
      default:
        throw new Error(`Asset type unknown ${(asset as any).type}`);
    }
  };

  // TODO(johnrjj) Consolidate w/ checkOrderCanBeFilledMakerSide
  checkOrderCanBeFilledTakerSide = async (
    order: NftOrderV4,
    takerWalletAddress: string
  ) => {
    const takerAsset = this.getTakerAsset(order);
    const takerApprovalStatus = await this.loadApprovalStatus(
      takerAsset,
      takerWalletAddress
    );
    const takerBalance = await this.fetchBalanceForAsset(
      this.getTakerAsset(order),
      takerWalletAddress
    );

    const hasBalance: boolean = takerBalance.gte(
      (takerAsset as UserFacingERC20AssetDataSerializedV4).amount ?? 1
    );

    const isApproved: boolean =
      takerApprovalStatus.contractApproved ||
      takerApprovalStatus.tokenIdApproved ||
      false;

    const canOrderBeFilled: boolean = hasBalance && isApproved;

    return {
      approvalStatus: takerApprovalStatus,
      balance: takerBalance.toString(),
      isApproved,
      hasBalance,
      canOrderBeFilled,
    };
  };

  checkOrderCanBeFilledMakerSide = async (
    order: NftOrderV4
    // override?: Partial<VerifyOrderOptionsOverrides>
  ) => {
    const makerAddress = order.maker;
    const makerAsset = this.getMakerAsset(order);
    const makerApprovalStatus = await this.loadApprovalStatus(
      makerAsset,
      makerAddress
    );
    const makerBalance = await this.fetchBalanceForAsset(
      this.getMakerAsset(order),
      makerAddress
    );

    const hasBalance: boolean = makerBalance.gte(
      (makerAsset as UserFacingERC20AssetDataSerializedV4).amount ?? 1
    );
    const isApproved: boolean =
      makerApprovalStatus.tokenIdApproved ||
      makerApprovalStatus.contractApproved ||
      false;
    const canOrderBeFilled: boolean = hasBalance && isApproved;

    return {
      approvalStatus: makerApprovalStatus,
      balance: makerBalance.toString(),
      isApproved,
      hasBalance,
      canOrderBeFilled,
    };
  };

  /**
   * Convenience function to sum all fees. Total fees denominated in erc20 token amount.
   * @param order A 0x v4 order (signed or un-signed);
   * @returns Total summed fees for a 0x v4 order. Amount is represented in Erc20 token units.
   */
  getTotalFees = (order: NftOrderV4): BigNumber => {
    const fees = order.fees;
    // In 0x v4, fees are additive (not included in the original erc20 amount)
    let feesTotal = ZERO_AMOUNT;
    fees.forEach((fee) => {
      feesTotal = feesTotal.add(BigNumber.from(fee.amount));
    });
    return feesTotal;
  };

  /**
   * Calculates total order cost.
   * In 0x v4, fees are additive (i.e. they are not deducted from the order amount, but added on top of)
   * @param order A 0x v4 order;
   * @returns Total cost of an order (base amount + fees). Amount is represented in Erc20 token units. Does not include gas costs.
   */
  getErc20TotalIncludingFees = (order: NftOrderV4): BigNumber => {
    const fees = order.fees;
    // In 0x v4, fees are additive (not included in the original erc20 amount)
    let feesTotal = this.getTotalFees(order);
    const orderTotalCost = BigNumber.from(order.erc20TokenAmount).add(
      feesTotal
    );
    return orderTotalCost;
  };
}

export { NftSwapV4 };
