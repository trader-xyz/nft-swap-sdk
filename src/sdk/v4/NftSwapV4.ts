import { Signer, TypedDataSigner } from '@ethersproject/abstract-signer';
import { BaseProvider } from '@ethersproject/providers';
import { BigNumber } from 'ethers';
import { IZeroEx, IZeroEx__factory } from '../../contracts';
import { NULL_ADDRESS } from '../../utils/eth';
import { SupportedChainIds } from '../v3/types';
import {
  approveAsset,
  ERC721OrderStruct,
  parseRawSignature,
  SignatureStruct,
  signOrderWithEoaWallet,
  SwappableAsset,
  TradeDirection,
  UserFacingERC1155AssetDataSerializedNormalizedSingle,
  UserFacingERC20AssetDataSerialized,
  UserFacingERC721AssetDataSerialized,
} from './pure';

export enum SupportedChainIdsV4 {
  Ropsten = 3,
}

const ZERO = BigNumber.from(0);

const EXCHANGE_PROXY_DEFAULT_ADDRESS_ROPSTEN =
  '0xdef1c0ded9bec7f1a1670819833240f027b25eff';

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

  // TyPeSaFeTy: Order types supported:
  // ERC721<>ERC20
  // ERC1155<>ERC20
  // Below ensures type-safe for those specific combinations
  buildOrder2(
    makerAsset: UserFacingERC1155AssetDataSerializedNormalizedSingle,
    takerAsset: UserFacingERC20AssetDataSerialized
  ): ERC721OrderStruct;
  buildOrder2(
    makerAsset: UserFacingERC20AssetDataSerialized,
    takerAsset: UserFacingERC1155AssetDataSerializedNormalizedSingle
  ): ERC721OrderStruct;
  buildOrder2(
    makerAsset: UserFacingERC721AssetDataSerialized,
    takerAsset: UserFacingERC20AssetDataSerialized
  ): ERC721OrderStruct;
  buildOrder2(
    makerAsset: UserFacingERC20AssetDataSerialized,
    takerAsset: UserFacingERC721AssetDataSerialized
  ): ERC721OrderStruct;
  buildOrder2(makerAsset: SwappableAsset, takerAsset: SwappableAsset) {
    return this.buildOrder({} as any, {} as any, '') as ERC721OrderStruct;
  }

  buildOrder = (
    makerAsset: UserFacingERC721AssetDataSerialized,
    takerAsset: UserFacingERC20AssetDataSerialized,
    makerWalletAddress: string
  ): ERC721OrderStruct => {
    return {
      direction: TradeDirection.SellNFT,
      maker: makerWalletAddress,
      taker: NULL_ADDRESS,
      expiry: 1743224013,
      nonce: 6969,
      erc20Token: takerAsset.tokenAddress,
      erc20TokenAmount: takerAsset.amount,
      fees: [],
      erc721Token: makerAsset.tokenAddress,
      erc721TokenId: makerAsset.tokenId,
      erc721TokenProperties: [],
    };
  };

  signOrder = (orderStruct: ERC721OrderStruct) => {
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

export { NftSwapV4 };
