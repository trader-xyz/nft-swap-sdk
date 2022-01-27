import type { BigNumber, BigNumberish } from '@ethersproject/bignumber';
import type { BytesLike } from '@ethersproject/bytes';

export enum SupportedChainIds {
  Ropsten = 3,
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

export type ECSignature = {
  v: BigNumberish;
  r: BytesLike;
  s: BytesLike;
};

export type SignatureStruct = {
  signatureType: BigNumberish;
  v: BigNumberish;
  r: BytesLike;
  s: BytesLike;
};
