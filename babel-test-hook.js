require('babel-register')({ // eslint-disable-line import/no-extraneous-dependencies
  presets: ['env', 'stage-2', 'react'],
  ignore: (fileName) => {
    const nodeModIdx = fileName.lastIndexOf('node_modules');
    const folioIdx = fileName.lastIndexOf('@folio');
    if (fileName.endsWith('.js') && (nodeModIdx === -1 || folioIdx > nodeModIdx)) {
      return false;
    }
    return true;
  }
});
