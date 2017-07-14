import 'rxjs/add/operator/map';

// returns epic which executes after refresh action
// and syncs/refreshes given resource
export function refreshEpic(resource) {
  return (action$) => action$
    .ofType('REFRESH')
    .map(action => {
      const { name, path } = action.meta;
      const resPath = resource.optionsTemplate.path || '';

      console.log(name, path, resPath, resPath.startsWith(path), resource.isVisible());
      if (
        resource.isVisible() &&
        resource.name != name &&
        resPath.startsWith(path)) {
        resource.sync();
      }
      return { ...action, type: 'REFRESH_SUCCESS' };
    })
}

