const actionNames = [
  'CREATE_SUCCESS',
  'UPDATE_SUCCESS',
  'DELETE_SUCCESS',
];

// returns list of epics which execute (and dispatch REFRESH)
// after mutation happens on a given resource
export function mutationEpics(resource) {
  const actionPrefix = resource.crudName.toUpperCase();
  const options = resource.optionsTemplate;

  return actionNames.map(name =>
    (action$) => action$
      .ofType(`${actionPrefix}_${name}`)
      .debounceTime(100)
      .map(action => {
        const path = options.path.replace(/[\/].*$/g, '');
        const name = resource.name;
        const meta = Object.assign({}, action.meta, { path, name });
        return { ...action, meta, type: 'REFRESH' };
      })
  );
}
