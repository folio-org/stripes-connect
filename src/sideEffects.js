import { combineEpics, createEpicMiddleware } from 'redux-observable';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import 'rxjs/add/operator/mergeMap';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/debounceTime';

const actionNames = [
  'CREATE_SUCCESS',
  'UPDATE_SUCCESS',
  'DELETE_SUCCESS',
];

const epic$ = new BehaviorSubject(combineEpics());
const rootEpic = (action$, store) =>
  epic$.mergeMap(epic => epic(action$, store));
const middleware = createEpicMiddleware(rootEpic);

function addMutationEpics(resource) {
  const actionPrefix = resource.crudName.toUpperCase();
  const options = resource.optionsTemplate;
  actionNames.forEach(name => {
    epic$.next(action$ =>
      action$
      .ofType(`${actionPrefix}_${name}`)
      .debounceTime(100)
      .map(action => {
        const path = options.path.replace(/[\/].*$/g, '');
        const name = resource.name;
        const meta = Object.assign({}, action.meta, { path, name });
        return { ...action, meta, type: 'REFRESH' };
    }));
  });
}

function addRefreshEpic(resource) {
  epic$.next(action$ =>
    action$
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
  );
}

function init(resource) {
  addMutationEpics(resource);
  addRefreshEpic(resource);
}

export default {
  middleware,
  init
};
