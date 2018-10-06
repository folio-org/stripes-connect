require('babel-register')({
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
