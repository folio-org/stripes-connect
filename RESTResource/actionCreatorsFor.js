export default function actionCreatorsFor(resource) {
  const commonMeta = {
    resource: resource.name,
    module: resource.module,
    dataKey: resource.dataKey,
    throwErrors: resource.throwErrors,
  };
  const passPayload = name => data => ({
    type: `@@stripes-connect/${name}`,
    payload: data,
    meta: commonMeta,
  });
  const passMetaPayload = name => (meta, data) => ({
    type: `@@stripes-connect/${name}`,
    payload: data,
    meta: Object.assign({}, meta, commonMeta),
  });
  return {
    createStart: passPayload('CREATE_START'),

    createSuccess: passMetaPayload('CREATE_SUCCESS'),

    updateStart: passPayload('UPDATE_START'),

    updateSuccess: passMetaPayload('UPDATE_SUCCESS'),

    deleteStart: passPayload('DELETE_START'),

    deleteSuccess: passMetaPayload('DELETE_SUCCESS'),

    mutationError: (err, mutator, meta) => ({
      type: '@@stripes-connect/MUTATION_ERROR',
      payload: { type: mutator, ...err },
      meta: Object.assign({}, commonMeta, meta),
    }),

    fetchStart: passPayload('FETCH_START'),

    fetchSuccess: passMetaPayload('FETCH_SUCCESS'),

    accFetchSuccess: passMetaPayload('ACC_FETCH_SUCCESS'),

    offsetFetchSuccess: passMetaPayload('OFFSET_FETCH_SUCCESS'),

    fetchError: passPayload('FETCH_ERROR'),

    fetchAbort: passPayload('FETCH_ABORT'),

    pagingStart: () => ({
      type: '@@stripes-connect/PAGING_START',
      meta: commonMeta,
    }),

    pageStart: url => ({
      type: '@@stripes-connect/PAGE_START',
      url,
      meta: commonMeta,
    }),

    pageSuccess: passMetaPayload('PAGE_SUCCESS'),

    reset: () => ({
      type: '@@stripes-connect/RESET',
      meta: commonMeta,
    }),
  };
}
