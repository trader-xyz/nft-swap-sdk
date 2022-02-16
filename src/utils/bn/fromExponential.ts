/**
 * Return two parts array of exponential number
 * @param {number|string|Array} num
 * @return {string[]}
 */
export function getExponentialParts(num: number | string | Array<string>) {
  return Array.isArray(num) ? num : String(num).split(/[eE]/);
}

/**
 *
 * @param {number|string|Array} num - number or array of its parts
 */
export function isExponential(num: number | string | Array<string>) {
  const eParts = getExponentialParts(num);
  return !Number.isNaN(Number(eParts[1]));
}

/**
 * Converts exponential notation to a human readable string
 * @param {number|string|Array} num - number or array of its parts
 * @return {string}
 */
export function fromExponential(num: number | string | Array<string>) {
  const eParts = getExponentialParts(num);
  if (!isExponential(eParts)) {
    return eParts[0];
  }

  const sign = eParts[0][0] === '-' ? '-' : '';
  const digits = eParts[0].replace(/^-/, '');
  const digitsParts = digits.split('.');
  const wholeDigits = digitsParts[0];
  const fractionDigits = digitsParts[1] || '';
  let e = Number(eParts[1]);

  if (e === 0) {
    return `${sign + wholeDigits}.${fractionDigits}`;
  } else if (e < 0) {
    // move dot to the left
    const countWholeAfterTransform = wholeDigits.length + e;
    if (countWholeAfterTransform > 0) {
      // transform whole to fraction
      const wholeDigitsAfterTransform = wholeDigits.substr(
        0,
        countWholeAfterTransform
      );
      const wholeDigitsTransformedToFraction = wholeDigits.substr(
        countWholeAfterTransform
      );
      return `${
        sign + wholeDigitsAfterTransform
      }.${wholeDigitsTransformedToFraction}${fractionDigits}`;
    } else {
      // not enough whole digits: prepend with fractional zeros

      // first e goes to dotted zero
      let zeros = '0.';
      e = countWholeAfterTransform;
      while (e) {
        zeros += '0';
        e += 1;
      }
      return sign + zeros + wholeDigits + fractionDigits;
    }
  } else {
    // move dot to the right
    const countFractionAfterTransform = fractionDigits.length - e;
    if (countFractionAfterTransform > 0) {
      // transform fraction to whole
      // countTransformedFractionToWhole = e
      const fractionDigitsAfterTransform = fractionDigits.substr(e);
      const fractionDigitsTransformedToWhole = fractionDigits.substr(0, e);
      return `${
        sign + wholeDigits + fractionDigitsTransformedToWhole
      }.${fractionDigitsAfterTransform}`;
    } else {
      // not enough fractions: append whole zeros
      let zerosCount = -countFractionAfterTransform;
      let zeros = '';
      while (zerosCount) {
        zeros += '0';
        zerosCount -= 1;
      }
      return sign + wholeDigits + fractionDigits + zeros;
    }
  }
}
