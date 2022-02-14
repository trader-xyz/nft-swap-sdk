const parse = (str: string, decode = decodeURIComponent) => {
  return (str + '')
    .replace(/\+/g, ' ')
    .split('&')
    .filter(Boolean)
    .reduce(function (obj: Record<string, any>, item, index: number) {
      var ref = item.split('=');
      var key = decode(ref[0] || '');
      var val = decode(ref[1] || '');
      var prev = obj[key];
      obj[key] =
        prev === undefined ? val : ([] as Array<any>).concat(prev, val);
      return obj;
    }, {});
};

const stringify = (obj: Record<string, any>, encode = encodeURIComponent) => {
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
