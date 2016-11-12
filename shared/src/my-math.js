import "./lodash-extension";

export default {
  binom(n, k) {
    if (2 * k > n) k = n - k;
    if (k === 0) return 1;
    return _.rangeClosed(n - k + 1, n).reduce((prod, x) => prod * x, 1) / _.rangeClosed(1, k).reduce((prod, x) => prod * x, 1);
  },
  clamp(x, min, max) {
    return [min, x, max].sort((x, y) => x - y)[1];
  },
  lerp(x, y, t) {
    return x + (y - x) * t;
  },
  cartesianProduct(...args) {
    if (typeof(args[args.length - 1]) === "function") {
      const callback = args.pop();
      const callbackArgs = [];
      (function loop() {
        if (args.length === 0) {
          callback(...callbackArgs);
        } else {
          const values = args.pop();
          for (let value of values) {
            callbackArgs.unshift(value);
            loop();
            callbackArgs.shift(value);
          }
          args.push(values);
        }
      })();
    } else {
      return args.reduce((matrix, values) => values.reduce((array, value) => array.concat(matrix.map(row => row.concat([value]))), []), [[]]);
    }
  }
};
