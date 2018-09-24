// returns epic which executes after a refresh action
// and syncs/refreshes given resource
export function refreshEpic(resource) {
  return (action$) => action$
    .ofType('REFRESH')
    .filter(action => {
      const { name, path } = action.meta;
      const options = resource.optionsTemplate;
      const resPath = options.path || '';

      if (!resource.isVisible()) return false;

      if (options.shouldRefresh) {
        return options.shouldRefresh(resource, action);
      }
      else {
        return resPath.startsWith(path);
      }
    })
    .debounceTime(100)
    .map(action => {
      resource.sync();
      return { ...action, type: 'REFRESH_SUCCESS' };
    })
}

