const actionNames = [
  'CREATE_SUCCESS',
  'UPDATE_SUCCESS',
  'DELETE_SUCCESS',
];

// returns list of epics which execute
// after mutation happens on a given resource
export default function mutationEpics(resource) {
  return actionNames.map(actionName => (action$) => action$
    .ofType(`@@stripes-connect/${actionName}`)
    .filter(action => action.meta.resource === resource.name && !action.meta.silent)
    .map(action => {
      let { meta: { path } } = action;
      path = path && path.replace(/[\/].*$/g, '');  // eslint-disable-line no-useless-escape

      const name = resource.name;
      const meta = Object.assign({}, action.meta, { path, name });
      return { ...action, meta, type: 'REFRESH' };
    }));
}
