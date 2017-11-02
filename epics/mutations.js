const actionNames = [
  'CREATE_SUCCESS',
  'UPDATE_SUCCESS',
  'DELETE_SUCCESS',
];

// returns list of epics which execute
// after mutation happens on a given resource
export function mutationEpics(resource) {
  const options = resource.optionsTemplate;

  return actionNames.map(actionName =>
    (action$) => action$
      .ofType(`@@stripes-connect/${actionName}`)
      .filter(action => action.meta.resource === resource.name)
      .map(action => {
        const path = options.path && options.path.replace(/[\/].*$/g, '');
        const name = resource.name;
        const meta = Object.assign({}, action.meta, { path, name });
        return { ...action, meta, type: 'REFRESH' };
      })
  );
}
