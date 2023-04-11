const config = {
  externals: {
    rxjs: {
      root: 'rxjs',
      commonjs2: 'rxjs',
      commonjs: 'rxjs',
      amd: 'rxjs',
      umd: 'rxjs'
    },
    'redux-observable': {
      root: 'redux-observable',
      commonjs2: 'redux-observable',
      commonjs: 'redux-observable',
      amd: 'redux-observable',
      umd: 'redux-observable'
    },
  }
};

module.exports = config;
