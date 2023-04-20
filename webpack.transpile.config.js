const externals = [
  'react/jsx-runtime',
  'rxjs/operators'
];

const config = {
  externals: externals.reduce((acc, name) => {
    acc[name] = {
      root: name,
      commonjs2: name,
      commonjs: name,
      amd: name,
      umd: name
    };
    return acc;
  }, {})
};

module.exports = config;
