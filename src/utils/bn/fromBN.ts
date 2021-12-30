// From: https://github.com/paulrberg/evm-bn
import { BigNumber, FixedNumber } from '@ethersproject/bignumber';

/**
 * Convert a big number with a custom number of decimals to a stringified fixed-point number.
 */
export function fromBn(x: BigNumber, decimals: number = 18): string {
  if (x === undefined) {
    throw new Error('Input must not be undefined');
  }

  if (decimals < 1 || decimals > 77) {
    throw new Error('Decimals must be between 1 and 18');
  }

  const result: string = FixedNumber.fromValue(
    x,
    decimals,
    `fixed256x${decimals}`
  ).toString();
  return result.replace(/.0$/, '');
}
