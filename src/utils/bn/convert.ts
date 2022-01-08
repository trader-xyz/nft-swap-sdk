import { BigNumber } from '@ethersproject/bignumber';

export const convertStringToBN = (s: string) => {
  return BigNumber.from(s);
};

export const convertCollectionToBN = (arr: string[]) => {
  return arr.map(convertStringToBN);
};
