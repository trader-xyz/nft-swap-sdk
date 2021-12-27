import {
  TypedDataDomain,
  TypedDataField,
} from '@ethersproject/abstract-signer';
import { arrayify } from '@ethersproject/bytes';
import { _TypedDataEncoder } from '@ethersproject/hash';

export interface TypedData {
  domain: TypedDataDomain;
  types: Record<string, Array<TypedDataField>>;
  message: Record<string, any>;
  primaryType?: string;
}

export type { TypedDataDomain, TypedDataField };

export const encodeTypedDataHash = (typedData: TypedData): string => {
  const types = { ...typedData.types };

  // remove EIP712Domain key from types as ethers will auto-gen it in
  // the hash encoder below
  delete types['EIP712Domain'];

  return _TypedDataEncoder.hash(typedData.domain, types, typedData.message);
};

export const encodeTypedDataDigest = (typedData: TypedData): Uint8Array => {
  return arrayify(encodeTypedDataHash(typedData));
};
