import { Signer } from '@ethersproject/abstract-signer';
import type { BigNumber, BigNumberish } from '@ethersproject/bignumber';
import type { BytesLike } from '@ethersproject/bytes';
import { IZeroEx } from '../../contracts';

export enum SupportedChainIds {
  Ropsten = 3,
}

export enum OrderStatus {
  Invalid = 0,
  Fillable = 1,
  Unfillable = 2,
  Expired = 3,
}

export type FeeStruct = {
  recipient: string;
  amount: BigNumberish;
  feeData: BytesLike;
};

export type PropertyStruct = {
  propertyValidator: string;
  propertyData: BytesLike;
};

export type ERC1155OrderStruct = {
  direction: BigNumberish;
  maker: string;
  taker: string;
  expiry: BigNumberish;
  nonce: BigNumberish;
  erc20Token: string;
  erc20TokenAmount: BigNumberish;
  fees: FeeStruct[];
  erc1155Token: string;
  erc1155TokenId: BigNumberish;
  erc1155TokenProperties: PropertyStruct[];
  erc1155TokenAmount: BigNumberish;
};

export type ERC721OrderStruct = {
  direction: BigNumberish;
  maker: string;
  taker: string;
  expiry: BigNumberish;
  nonce: BigNumberish;
  erc20Token: string;
  erc20TokenAmount: BigNumberish;
  fees: FeeStruct[];
  erc721Token: string;
  erc721TokenId: BigNumberish;
  erc721TokenProperties: PropertyStruct[];
};

export interface OrderStructOptionsCommon {
  direction: BigNumberish;
  maker: string;
  taker: string;
  expiry: Date | number;
  nonce: BigNumberish;
  // erc20Token: string;
  // erc20TokenAmount: BigNumberish;
  fees: FeeStruct[];
}

export interface OrderStructOptionsCommonStrict {
  direction: BigNumberish;
  // erc20Token: string;
  // erc20TokenAmount: BigNumberish;
  maker: string;
  taker?: string;
  expiry?: Date | number;
  nonce?: BigNumberish;
  fees?: FeeStruct[];
}

export interface Fee {
  recipient: string;
  amount: BigNumber;
  feeData: string;
}

export interface Property {
  propertyValidator: string;
  propertyData: string;
}

export type NftOrderV4 = ERC1155OrderStruct | ERC721OrderStruct;

export interface SignedERC721OrderStruct extends ERC721OrderStruct {
  signature: SignatureStruct;
}

export interface SignedERC1155OrderStruct extends ERC1155OrderStruct {
  signature: SignatureStruct;
}

export type SignedNftOrderV4 =
  | SignedERC721OrderStruct
  | SignedERC1155OrderStruct;

export type ECSignature = {
  v: BigNumberish;
  r: BytesLike;
  s: BytesLike;
};

export type SignatureStruct = {
  signatureType: BigNumberish; // 2 for EIP-712
  v: BigNumberish;
  r: BytesLike;
  s: BytesLike;
};

export interface ApprovalOverrides {
  signer: Signer;
  approve: boolean;
  exchangeContractAddress: string;
  chainId: number;
}

export interface FillOrderOverrides {
  signer: Signer;
  exchangeContract: IZeroEx;
  /**
   * Fill order with native token if possible
   * e.g. If taker asset is WETH, allows order to be filled with ETH
   */
  fillOrderWithNativeTokenInsteadOfWrappedToken: boolean;
}

export interface BuildOrderAdditionalConfig {
  direction: BigNumberish;
  maker: string;
  taker: string;
  expiry: BigNumberish;
  nonce: BigNumberish;
}
