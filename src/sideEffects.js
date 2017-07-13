import { combineEpics, createEpicMiddleware } from 'redux-observable';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import 'rxjs/add/operator/mergeMap';
import 'rxjs/add/operator/map';

const actionNames = [
  'CREATE_SUCCESS',
  'UPDATE_SUCCESS',
  'DELETE_SUCCESS',
];

const epic$ = new BehaviorSubject(combineEpics());
const rootEpic = (action$, store) =>
  epic$.mergeMap(epic => epic(action$, store));

function addMutationEpics(resource) {
  const actionPrefix = resource.crudName.toUpperCase();
  const options = resource.optionsTemplate;

  actionNames.forEach(name => {
    epic$.next(action$ =>
      action$
      .ofType(`${actionPrefix}_${name}`)
      .map(action => {
        const path = options.path.replace(/[\?|:|%].*$/g, '');
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
      if (
        resource.isVisible() &&
        resource.name != name &&
        path.match(resource.optionsTemplate.path)) {
        resource.sync();
      }
      return { ...action, type: 'REFRESH_DONE' };
    })
  );
}

function init(resource) {
  addMutationEpics(resource);
  addRefreshEpic(resource);
}

const middleware = createEpicMiddleware(rootEpic);

export default {
  middleware,
  init
};
