require('@babel/register')({
  plugins: [
    ['@babel/plugin-proposal-decorators', { 'legacy': true }],
    ['@babel/plugin-proposal-class-properties', { 'loose': true }],
    '@babel/plugin-proposal-export-namespace-from',
    '@babel/plugin-proposal-function-sent',
    '@babel/plugin-proposal-numeric-separator',
    '@babel/plugin-proposal-throw-expressions',
    '@babel/plugin-syntax-import-meta',
  ],
  presets: [
    ['@babel/preset-env'],
    ['@babel/preset-react'],
  ],
  test: (fileName) => {
    const nodeModIdx = fileName.lastIndexOf('node_modules');
    if (fileName.endsWith('.js') && (nodeModIdx === -1 || fileName.lastIndexOf('@folio') > nodeModIdx)) {
      return true;
    }
    return false;
  }
});
