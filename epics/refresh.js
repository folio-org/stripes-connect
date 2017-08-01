// returns epic which executes after a refresh action
// and syncs/refreshes given resource
export function refreshEpic(resource) {
  return (action$) => action$
    .ofType('REFRESH')
    .filter(action => {
      const { name, path } = action.meta;
      const resPath = resource.optionsTemplate.path || '';
      return resource.isVisible() && resPath.startsWith(path);
    })
    .debounceTime(100)
    .map(action => {
      resource.sync();
      return { ...action, type: 'REFRESH_SUCCESS' };
    })
}

