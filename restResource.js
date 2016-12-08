import fetch from 'isomorphic-fetch';
import crud from 'redux-crud';
import _ from 'lodash';
import uuid from 'node-uuid';

const defaultDefaults = { pk: 'id', clientGeneratePk: true, fetch: true };

export default class restResource {

  constructor(name, query = {}, module = null, defaults = defaultDefaults) {
    this.name = name;
    this.module = module;
    this.crudName = module ? `${module}_${name}` : name;
    // TODO: actual substitution of params/state
    this.optionsTemplate = _.merge({}, defaults, query);
    this.options = null;
    this.crudActions = crud.actionCreatorsFor(this.crudName);
    this.crudReducers = crud.reducersFor(this.crudName,
      { key: this.optionsTemplate.pk, store: crud.STORE_MUTABLE });
    // JavaScript methods are not bound to their instance by default
    this.reducer = this.reducer.bind(this);
  }

  getMutator(dispatch) {
    return {
      DELETE: record => dispatch(this.deleteAction(record)),
      PUT: record => dispatch(this.updateAction(record)),
      POST: record => dispatch(this.createAction(record)),
    };
  }

  reducer(state = [], action) {
    switch (action.type) {
      // extra reducer (beyond redux-crud generated reducers)
      // for clearing a list before populating from new fetch
      case `CLEAR_${this.stateKey().toUpperCase()}`:
        return [];
      default:
        return this.crudReducers(state, action);
    }
  }

  stateKey() {
    return this.crudName;
  }

  refresh(dispatch, props) {
    if (this.optionsTemplate.fetch === false) return null;
    // deep copy
    this.options = JSON.parse(JSON.stringify(this.optionsTemplate));
    let dynamicPartsSatisfied = true;
    this.options.path = this.options.path.replace(/([:,?]){(.*?)}/g, (x, ns, name) => {
      switch (ns) {
        case '?': {
          const queryParam = _.get(props, ['location', 'query', name], null);
          if (queryParam === null) dynamicPartsSatisfied = false;
          return queryParam;
        }
        case ':': {
          const pathComp = _.get(props, ['params', name], null);
          if (pathComp === null) dynamicPartsSatisfied = false;
          return pathComp;
        }
      }
    });
    if (!dynamicPartsSatisfied) {
      if (this.options.staticFallback && this.options.staticFallback.path) {
        this.options.path = this.options.staticFallback.path;
      } else {
        return null;
      }
    }
    return dispatch(this.fetchAction());
  }

  createAction(record) {
    const that = this;
    const { root, path, pk, clientGeneratePk, headers, POST } = this.options;
    const crudActions = this.crudActions;
    const url = [root, POST.path || path].join('/');
    return (dispatch) => {
      // Optimistic record creation ('clientRecord')
      const clientGeneratedId = record.id ? record.id : uuid();
      const clientRecord = { ...record, id: clientGeneratedId };
      clientRecord[pk] = clientGeneratedId;
      dispatch(crudActions.createStart(clientRecord));
      if (clientGeneratePk) {
        record[pk] = clientGeneratedId;
      }
      // Send remote record ('record')
      return fetch(url, {
        method: 'POST',
        headers: Object.assign({}, headers, POST.headers),
        body: JSON.stringify(record),
      })
        .then((response) => {
          if (response.status >= 400) {
            response.text().then((text) => {
              that.error(dispatch, 'POST', crudActions.createError, clientRecord, that.module, that.name, text);
            });
          } else {
            response.json().then((json) => {
              if (json[pk] && !json.id) json.id = json[pk];
              dispatch(crudActions.createSuccess(json, clientGeneratedId));
            });
          }
        }).catch((reason) => {
          that.error(dispatch, 'POST', crudActions.createError, clientRecord, that.module, that.name, reason);
        });
    };
  }

  updateAction(record) {
    const that = this;
    const { root, path, pk, headers, PUT } = this.options;
    const crudActions = this.crudActions;
    const url = [root, PUT.path || path].join('/');
    const clientRecord = record;
    if (clientRecord[pk] && !clientRecord.id) clientRecord.id = clientRecord[pk];
    return (dispatch) => {
      dispatch(crudActions.updateStart(clientRecord));
      return fetch(url, {
        method: 'PUT',
        headers: Object.assign({}, headers, PUT.headers),
        body: JSON.stringify(record),
      })
        .then((response) => {
          if (response.status >= 400) {
            response.text().then((text) => {
              that.error(dispatch, 'PUT', crudActions.updateError, record, that.module, that.name, text);
            });
          } else {
            /* Patrons api will not return JSON
            response.json().then ( (json) => {
              if (json[options.pk] && !json.id) json.id = json[options.pk];
              dispatch(crudActions.updateSuccess(json));
            });
            */
            dispatch(crudActions.updateSuccess(clientRecord));
          }
        }).catch((reason) => {
          that.error(dispatch, 'PUT', crudActions.updateError, record, that.module, that.name, reason.message);
        });
    };
  }

  deleteAction(record) {
    const that = this;
    const { root, path, pk, headers, DELETE } = this.options;
    const crudActions = this.crudActions;
    const resolvedPath = DELETE.path || path;
    const url = (resolvedPath.endsWith(record[pk]) ?
                   [root, resolvedPath].join('/')
                   :
                   [root, resolvedPath, record[pk]].join('/'));
    return (dispatch) => {
      if (record[pk] && !record.id) record.id = record[pk];
      dispatch(crudActions.deleteStart(record));
      return fetch(url, {
        method: 'DELETE',
        headers: Object.assign({}, headers, DELETE.headers),
      })
        .then((response) => {
          if (response.status >= 400) {
            response.text().then((text) => {
              that.error(dispatch, 'DELETE', crudActions.deleteError, record, that.module, that.name, text);
            });
          } else {
            dispatch(crudActions.deleteSuccess(record));
          }
        }).catch((reason) => {
          that.error(dispatch, 'DELETE', crudActions.deleteError, record, that.module, that.name, reason.message);
        });
    };
  }


  fetchAction() {
    const that = this;
    const { root, path, headers, GET, records } = this.options;
    const crudActions = this.crudActions;
    const key = this.stateKey();
    // i.e. only join truthy elements
    const url = [root, path].filter(_.identity).join('/');
    return (dispatch) => {
      dispatch(crudActions.fetchStart());
      return fetch(url, { headers: Object.assign({}, headers, GET.headers) })
        .then((response) => {
          if (response.status >= 400) {
            response.text().then((text) => {
              that.error(dispatch, 'GET', crudActions.fetchError, null, that.module, that.name, text);
            });
          } else {
            response.json().then((json) => {
              dispatch({ type: `CLEAR_${key.toUpperCase()}` });
              const data = (records ? json[records] : json);
              dispatch(crudActions.fetchSuccess(data));
            });
          }
        }).catch((reason) => {
          that.error(dispatch, 'GET', crudActions.fetchError, null, that.module, that.name, reason.message);
        });
    };
  }


  // This is an ugly fat API, but we need to be able to do all this in a single call
  error(dispatch, op, creator, record, module, resource, reason) {
    console.log(`HTTP ${op} for module ${module} resource ${resource} failed: ${reason}`);
    const data = { module: module, resource: resource, op: op };
    // Annoyingly, some redux-crud action creators have different signatures
    const action = record ?
        creator(reason, record, data) :
        creator(reason, data);
    dispatch(action);
  }
}
