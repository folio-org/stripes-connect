const { babelOptions } = require('@folio/stripes-cli');

require('@babel/register')({
  ...babelOptions,
  test: (fileName) => {
    const nodeModIdx = fileName.lastIndexOf('node_modules');
    if (fileName.endsWith('.js') && (nodeModIdx === -1 || fileName.lastIndexOf('@folio') > nodeModIdx)) {
      return true;
    }
    return false;
  }
});
