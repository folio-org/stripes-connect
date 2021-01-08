import { ofType } from 'redux-observable';
import {
  filter,
  map,
  debounceTime,
} from 'rxjs/operators';

function shouldResourceRefresh(action, resource) {
  const { path } = action.meta;
  const { optionsTemplate, cachedProps } = resource;
  let resPath;

  if (!resource.isVisible()) return false;

  // check compiled path first
  if (cachedProps && cachedProps.root) {
    const { root: { store } } = cachedProps;
    const state = store.getState();
    const options = resource.verbOptions('GET', state, cachedProps);
    resPath = options && options.path;
  }

  if (!resPath) {
    resPath = optionsTemplate.path || (optionsTemplate.GET || {}).path || '';
  }

  let refresh = (typeof resPath === 'string') && resPath.startsWith(path);

  if (optionsTemplate.shouldRefresh) {
    refresh = optionsTemplate.shouldRefresh(resource, action, refresh);
  }

  return refresh;
}

// returns epic which executes after a refresh action
// and syncs/refreshes given resource
export default function refreshEpic(resource) {
  return (action$) => action$.pipe(
    ofType('REFRESH'),
    filter(action => shouldResourceRefresh(action, resource)),
    debounceTime(100),
    map(action => {
      resource.sync();
      return { ...action, type: 'REFRESH_SUCCESS' };
    }),
  );
}
