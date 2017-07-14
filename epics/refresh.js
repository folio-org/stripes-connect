// returns epic which executes after a refresh action
// and syncs/refreshes given resource
export function refreshEpic(resource) {
  return (action$) => action$
    .ofType('REFRESH')
    /* TODO: turn on after new version of stripes-redux is released
    .filter(action => {
      const { name, path } = action.meta;
      const resPath = resource.optionsTemplate.path || '';
      return resource.isVisible() &&
        resource.name != name &&
        resPath.startsWith(path);
    })
    */
    .debounceTime(100)
    .map(action => {
      const { name, path } = action.meta;
      const resPath = resource.optionsTemplate.path || '';
      // TODO remove after new version of stripes-redux is released
      if (
        resource.isVisible() &&
        resource.name != name &&
        resPath.startsWith(path)) {
        resource.sync();
      }
      return { ...action, type: 'REFRESH_SUCCESS' };
    })
}

