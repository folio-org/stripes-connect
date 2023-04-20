const config = {
  externals: {
    'react/jsx-runtime': {
      root: 'react/jsx-runtime',
      commonjs2: 'react/jsx-runtime',
      commonjs: 'react/jsx-runtime',
      amd: 'react/jsx-runtime',
      umd: 'react/jsx-runtime'
    }
  }
};

module.exports = config;
