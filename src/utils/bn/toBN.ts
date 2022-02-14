// From https://github.com/paulrberg/evm-bn
import type { BigNumber } from '@ethersproject/bignumber';
import { parseFixed } from '@ethersproject/bignumber';
import { fromExponential } from './fromExponential';

/**
 * Convert a stringified fixed-point number to a big number with a custom number of decimals.
 *
 * @remarks
 * - Accepts scientific notation.
 * - Checks are in place to adhere to the numerical constraints of the EVM.
 */
export function toBn(x: string, decimals: number = 18): BigNumber {
  if (x === undefined || typeof x !== 'string') {
    throw new Error('Input must be a string');
  }

  if (decimals < 1 || decimals > 77) {
    throw new Error('Decimals must be between 1 and 77');
  }

  let xs: string = x;

  // Convert from exponential notation.
  if (x.includes('e')) {
    xs = fromExponential(x);
  }

  // Limit the number of decimals to the value provided.
  if (xs.includes('.')) {
    const parts: string[] = xs.split('.');
    parts[1] = parts[1].slice(0, decimals);
    xs = parts[0] + '.' + parts[1];
  }

  // Check if x is a whole number or a fixed-point number with some maximum number of decimals.
  const digits: number = 78 - decimals;
  const regexp: RegExp = new RegExp(
    `^[-+]?(\\d{1,${digits}}|(?=\\d+\\.\\d+)\\d{1,${digits}}\\.\\d{1,${decimals}})$`
  );

  if (regexp.test(xs)) {
    return parseFixed(xs, decimals);
  } else {
    throw new Error('Unknown format for fixed-point number: ' + x);
  }
}
