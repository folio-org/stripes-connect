// Provides a wrapper for crudActions that inserts extra metadata into
// the `meta` object of each action that is created.

function CrudActionsAugmenter(crudActions, extraMetadata) {
  return new Proxy(this, {
    get: (receiver, name) => receiver.augmentWithMetadata.bind(receiver, crudActions, name, extraMetadata),
  });
}

CrudActionsAugmenter.prototype.augmentWithMetadata = (crudActions, name, extraMetadata, arg1, arg2, arg3) => {
  if (!crudActions[name]) console.log(`CrudActionsAugmenter: no such function '${name}' in`, crudActions);
  const x = crudActions[name](arg1, arg2, arg3);
  return Object.assign({}, x, { meta: Object.assign({}, x.meta, extraMetadata) });
};

export default CrudActionsAugmenter;
