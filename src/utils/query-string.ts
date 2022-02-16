// Simple (tiny) query-string helpers

const parse = (
  str: string,
  decode: typeof decodeURIComponent = decodeURIComponent
) => {
  return (str + '')
    .replace(/\+/g, ' ')
    .split('&')
    .filter(Boolean)
    .reduce(function (obj: Record<string, any>, item) {
      const ref = item.split('=');
      const key = decode(ref[0] || '');
      const val = decode(ref[1] || '');
      const prev = obj[key];
      obj[key] =
        prev === undefined ? val : ([] as Array<any>).concat(prev, val);
      return obj;
    }, {});
};

const stringify = (
  obj: Record<string, any>,
  encode: typeof encodeURIComponent = encodeURIComponent
) => {
  return Object.keys(obj || {})
    .reduce(function (arr: any[], key) {
      [].concat(obj[key]).forEach(function (v) {
        arr.push(encode(key) + '=' + encode(v));
      });
      return arr;
    }, [])
    .join('&')
    .replace(/\s/g, '+');
};

export { parse, stringify };
