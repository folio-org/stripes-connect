import 'isomorphic-fetch'; /* global fetch */
import crud from 'redux-crud';
import _ from 'lodash';
import uuid from 'node-uuid';

const defaultDefaults = { pk: 'id', clientGeneratePk: true, fetch: true };

const optionsFromState = (options, state) => {
  if (options.type === 'okapi') {
    if (typeof state.okapi !== 'object') {
      throw new Error('State does not contain Okapi settings');
    }
    const okapiOptions = {
      root: state.okapi.url,
      headers: {
        'X-Okapi-Tenant': state.okapi.tenant,
        'Authorization' : state.okapi.token,
      },
    };
    return _.merge({}, options, okapiOptions);
  }
  return options;
};

// This is an ugly fat API, but we need to be able to do all this in a single call
function error(dispatch, op, creator, record, module, resource, reason) {
  console.log(`HTTP ${op} for module ${module} resource ${resource} failed: ${reason}`);
  const data = { module, resource, op };
  // Annoyingly, some redux-crud action creators have different signatures
  const action = record ?
      creator(reason, record, data) :
      creator(reason, data);
  dispatch(action);
}

export default class RESTResource {

  constructor(name, query = {}, module = null, defaults = defaultDefaults) {
    this.name = name;
    this.module = module;
    this.crudName = module ? `${module}_${name}` : name;
    this.optionsTemplate = _.merge({}, defaults, query);
    // TODO: This should call the function that parses the template and stay
    // null until dynamic parts are satisfied---currently mutators will fail
    // for dynamic manifests
    this.options = this.optionsTemplate;
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
    this.options = _.merge({}, this.optionsTemplate, this.optionsTemplate.GET);
    let dynamicPartsSatisfied = true;

    // Implements dynamic manifest components with ?{syntax}. Namespaces so far:
    // ? - query parameters in current url
    // : - path components as defined by react-router
    //
    // eslint-disable-next-line consistent-return
    this.options.path = this.options.path.replace(/([:,?]){(.*?)}/g, (match, ns, name) => {
      switch (ns) { // eslint-disable-line default-case
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
      if (typeof this.options.staticFallback === 'object') {
        _.merge(this.options, this.options.staticFallback);
      } else {
        return null;
      }
    }

    return dispatch(this.fetchAction());
  }

  createAction(record) {
    const that = this;
    const crudActions = this.crudActions;
    return (dispatch, getState) => {
      const options = optionsFromState(that.options, getState());
      const { root, path, pk, clientGeneratePk, headers, POST } = options;
      const url = [root, POST.path || path].join('/');
      // Optimistic record creation ('clientRecord')
      const clientGeneratedId = record.id ? record.id : uuid();
      const clientRecord = { ...record, id: clientGeneratedId };
      clientRecord[pk] = clientGeneratedId;
      dispatch(crudActions.createStart(clientRecord));
      // Prepare record for remote
      const remoteRecord = { ...record };
      if (clientGeneratePk) {
        remoteRecord[pk] = clientGeneratedId;
      }
      // Send remote record
      return fetch(url, {
        method: 'POST',
        headers: Object.assign({}, headers, POST.headers),
        body: JSON.stringify(remoteRecord),
      })
        .then((response) => {
          if (response.status >= 400) {
            response.text().then((text) => {
              error(dispatch, 'POST', crudActions.createError, clientRecord, that.module, that.name, text);
            });
          } else {
            response.json().then((json) => {
              console.log('response.headers.get(Authorization): ', response.headers.get('Authorization'));
              const responseRecord = { ...json };
              if (responseRecord[pk] && !responseRecord.id) responseRecord.id = responseRecord[pk];
              dispatch(crudActions.createSuccess(responseRecord, clientGeneratedId));
            });
          }
        }).catch((reason) => {
          error(dispatch, 'POST', crudActions.createError, clientRecord, that.module, that.name, reason);
        });
    };
  }

  updateAction(record) {
    const that = this;
    const crudActions = this.crudActions;
    const clientRecord = { ...record };
    return (dispatch, getState) => {
      const options = optionsFromState(that.options, getState());
      const { root, path, pk, headers, PUT } = options;
      const url = [root, PUT.path || path].join('/');
      if (clientRecord[pk] && !clientRecord.id) clientRecord.id = clientRecord[pk];
      dispatch(crudActions.updateStart(clientRecord));
      return fetch(url, {
        method: 'PUT',
        headers: Object.assign({}, headers, PUT.headers),
        body: JSON.stringify(record),
      })
        .then((response) => {
          if (response.status >= 400) {
            response.text().then((text) => {
              error(dispatch, 'PUT', crudActions.updateError, record, that.module, that.name, text);
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
          error(dispatch, 'PUT', crudActions.updateError, record, that.module, that.name, reason.message);
        });
    };
  }

  deleteAction(record) {
    const that = this;
    const crudActions = this.crudActions;
    return (dispatch, getState) => {
      const options = optionsFromState(that.options, getState());
      const { root, path, pk, headers, DELETE } = options;
      const resolvedPath = DELETE.path || path;
      const url = (resolvedPath.endsWith(record[pk]) ?
                     [root, resolvedPath].join('/')
                     :
                     [root, resolvedPath, record[pk]].join('/'));
      const clientRecord = { ...record };
      if (clientRecord[pk] && !clientRecord.id) clientRecord.id = clientRecord[pk];
      dispatch(crudActions.deleteStart(clientRecord));
      return fetch(url, {
        method: 'DELETE',
        headers: Object.assign({}, headers, DELETE.headers),
      })
        .then((response) => {
          if (response.status >= 400) {
            response.text().then((text) => {
              error(dispatch, 'DELETE', crudActions.deleteError, clientRecord, that.module, that.name, text);
            });
          } else {
            dispatch(crudActions.deleteSuccess(clientRecord));
          }
        }).catch((reason) => {
          error(dispatch, 'DELETE', crudActions.deleteError, clientRecord, that.module, that.name, reason.message);
        });
    };
  }


  fetchAction() {
    const that = this;
    const crudActions = this.crudActions;
    const key = this.stateKey();
    return (dispatch, getState) => {
      const options = optionsFromState(that.options, getState());
      const { root, path, headers, GET, records } = options;
      // i.e. only join truthy elements
      const url = [root, path].filter(_.identity).join('/');
      dispatch(crudActions.fetchStart());
      return fetch(url, { headers: Object.assign({}, headers, GET.headers) })
        .then((response) => {
          if (response.status >= 400) {
            response.text().then((text) => {
              error(dispatch, 'GET', crudActions.fetchError, null, that.module, that.name, text);
            });
          } else {
            response.json().then((json) => {
              dispatch({ type: `CLEAR_${key.toUpperCase()}` });
              const data = (records ? json[records] : json);
              dispatch(crudActions.fetchSuccess(data));
            });
          }
        }).catch((reason) => {
          error(dispatch, 'GET', crudActions.fetchError, null, that.module, that.name, reason.message);
        });
    };
  }
}
