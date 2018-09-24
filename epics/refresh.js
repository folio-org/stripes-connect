// returns epic which executes after a refresh action
// and syncs/refreshes given resource
export function refreshEpic(resource) {
  return (action$) => action$
    .ofType('REFRESH')
    .filter(action => {
      const { path } = action.meta;
      const options = resource.optionsTemplate;
      const resPath = options.path || (options.GET || {}).path || '';

      if (!resource.isVisible()) return false;

      let refresh = resPath.startsWith(path);

      if (options.shouldRefresh) {
        refresh = refresh || options.shouldRefresh(resource, action);
      }

      return refresh;

    })
    .debounceTime(100)
    .map(action => {
      resource.sync();
      return { ...action, type: 'REFRESH_SUCCESS' };
    })
}

