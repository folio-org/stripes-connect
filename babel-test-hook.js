require('@babel/register')({
  plugins: [
    ['@babel/plugin-proposal-decorators', { 'legacy': true }],
    // when building a platform directly, i.e. outside a workspace,
    // babel complains loudly and repeatedly that when these modules are enabled:
    // * @babel/plugin-proposal-class-properties,
    // * @babel/plugin-proposal-private-methods and
    // * @babel/plugin-proposal-private-property-in-object
    // the "loose" option must be the same for all three.
    // but @babel/preset-env sets it to false for ...private-methods.
    // overriding it here silences the complaint. STRWEB-12
    ['@babel/plugin-transform-class-properties', { 'loose': true }],
    ['@babel/plugin-transform-private-methods', { 'loose': true }],
    ['@babel/plugin-transform-private-property-in-object', { 'loose': true }],
    '@babel/plugin-transform-export-namespace-from',
    '@babel/plugin-proposal-function-sent',
    '@babel/plugin-transform-numeric-separator',
    '@babel/plugin-proposal-throw-expressions',
    '@babel/plugin-syntax-import-meta',
  ],
  presets: [
    ['@babel/preset-env', { targets: '> 0.25%, not dead' }],
    ['@babel/preset-flow', { all: true }],
    ['@babel/preset-react', {
      "runtime": "automatic"
    }],
    ['@babel/preset-typescript'],
  ],


  // plugins: [
  //   ['@babel/plugin-proposal-private-property-in-object', { 'loose': true }],
  //   ['@babel/plugin-proposal-decorators', { 'legacy': true }],
  //   ['@babel/plugin-proposal-class-properties', { 'loose': true }],
  //   ['@babel/plugin-proposal-private-methods', { 'loose': true }],
  //   '@babel/plugin-proposal-export-namespace-from',
  //   '@babel/plugin-proposal-function-sent',
  //   '@babel/plugin-proposal-numeric-separator',
  //   '@babel/plugin-proposal-throw-expressions',
  //   '@babel/plugin-syntax-import-meta',
  // ],
  // presets: [
  //   ['@babel/preset-env'],
  //   ['@babel/preset-react'],
  // ],
  test: (fileName) => {
    const nodeModIdx = fileName.lastIndexOf('node_modules');
    if (fileName.endsWith('.js') && (nodeModIdx === -1 || fileName.lastIndexOf('@folio') > nodeModIdx)) {
      return true;
    }
    return false;
  }
});
