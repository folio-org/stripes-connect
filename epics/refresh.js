// returns epic which executes after a refresh action
// and syncs/refreshes given resource
export function refreshEpic(resource) {
  return (action$) => action$
    .ofType('REFRESH')
    .map(action => {
      const { name, path } = action.meta;
      const resPath = resource.optionsTemplate.path || '';

      if (
        resource.isVisible() &&
        resource.name != name &&
        resPath.startsWith(path)) {
        resource.sync();
      }
      return { ...action, type: 'REFRESH_SUCCESS' };
    })
}

