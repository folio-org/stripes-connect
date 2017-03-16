import 'isomorphic-fetch'; /* global fetch */
import crud from 'redux-crud';
import _ from 'lodash';
import uuid from 'uuid';
import queryString from 'query-string';

const defaultDefaults = { pk: 'id', clientGeneratePk: true, fetch: true, clear: true };

function optionsFromState(options, state) {
  if (options.type === 'okapi') {
    if (typeof state.okapi !== 'object') {
      throw new Error('State does not contain Okapi settings');
    }
    const okapiOptions = {
      root: state.okapi.url,
      headers: {
        'X-Okapi-Tenant': state.okapi.tenant,
      },
    };
    if (state.okapi.token) okapiOptions.headers['X-Okapi-Token'] = state.okapi.token;
    return okapiOptions;
  }
  return {};
}


// This is an ugly fat API, but we need to be able to do all this in a single call
//
// 'reason' may be a simple string or a { status, message } object. It
// makes no difference to redux-crud, which simply passes it through
// blindly. Our errorReducer picks it apart as needed.
//
function error(dispatch, op, creator, record, module, resource, reason) {
  const data = { module, resource, op };
  // Annoyingly, some redux-crud action creators have different signatures
  const action = record ?
      creator(reason, record, data) :
      creator(reason, data);
  dispatch(action);
}

// The following fallback syntax is one small part of what Bash
// implements -- see the "Parameter Expansion" section of its
// manual. It's the part we need right now, but we should consider
// implementing all of it. And needless to say, it should apply to all
// kinds of substitutable.
//
function processFallback(s, getPath, props) {
  let name = s;
  let type;
  let val;

  const re = /(.*?):([+-])(.*)/.exec(name);
  if (re) {
    name = re[1];
    type = re[2];
    val = re[3];
    // console.log(`'${s}' matched fallback syntax: name='${name}', type='${type}', val='${val}'`);
  }
  let res = _.get(props, [].concat(getPath).concat(name), null);
  if (type === '+') {
    if (res !== null) {
      // console.log(`got value for name '${name}': replaced by '${val}'`);
      res = val;
    } else {
      // console.log(`no value for name '${name}': setting empty`);
      res = '';
    }
  }
  if (res === null && type === '-') {
    // console.log(`no value for name '${name}': replaced by '${val}'`);
    res = val;
  }
  return res;
}

// If we restructure the state into a per-module hierarchy we
// won't need to go through this dance STRIPES-238
function mockProps(state, module) {
  const mock = { data: {} };
  Object.keys(state).forEach((key) => {
    const re = new RegExp(`^${module}.(.*)`);
    const res = re.exec(key);
    if (Array.isArray(res) && res.length > 1) {
      mock.data[res[1]] = state[key];
    }
  });
  return mock;
}

// Implements dynamic manifest components with ?{syntax}. Namespaces so far:
// ? - query parameters in current url
// : - path components as defined by react-router
// $ - resources
//
export function substitutePath(original, props, state, module, logger) {
  // console.log('substitutePath(), props = ', props);
  const parsedQuery = queryString.parse(_.get(props, ['location', 'search']));
  let dynamicPartsSatisfied = true;
  let path;

  if (typeof original === 'function') {
    // Call back to resource-specific code
    path = original(parsedQuery, _.get(props, ['match', 'params']), mockProps(state, module).data, logger);
    dynamicPartsSatisfied = (typeof path === 'string');
  } else if (typeof original === 'string') {
    // eslint-disable-next-line consistent-return
    path = original.replace(/([:?$]){(.*?)}/g, (match, ns, name) => {
      switch (ns) { // eslint-disable-line default-case
        case '?': {
          const queryParam = processFallback(name, [], parsedQuery);
          if (queryParam === null) dynamicPartsSatisfied = false;
          return encodeURIComponent(queryParam);
        }
        case ':': {
          const pathComp = processFallback(name, ['match', 'params'], props);
          if (pathComp === null) dynamicPartsSatisfied = false;
          return encodeURIComponent(pathComp);
        }
        case '$': {
          const localState = processFallback(name.split('.'), ['data'], mockProps(state, module));
          if (localState === null) dynamicPartsSatisfied = false;
          return encodeURIComponent(localState);
        }
      }
    });
  } else {
    throw new Error('Invalid path');
  }

  logger.log('path', `substitutePath(${
    (typeof original === 'function') ? '<FUNCTION>' : original
  }) -> ${path}, satisfied=${dynamicPartsSatisfied}`);
  return dynamicPartsSatisfied ? path : null;
}

export default class RESTResource {

  constructor(name, query = {}, module = null, logger, defaults = defaultDefaults) {
    this.name = name;
    this.module = module;
    this.logger = logger;
    this.crudName = module ? `${module}_${name}` : name;
    this.optionsTemplate = _.merge({}, defaults, query);
    this.crudActions = crud.actionCreatorsFor(this.crudName);
    this.crudReducers = crud.List.reducersFor(this.crudName,
      { key: this.optionsTemplate.pk, store: crud.STORE_MUTABLE });
    // JavaScript methods are not bound to their instance by default
    this.reducer = this.reducer.bind(this);
  }

  getMutator(dispatch, props) {
    return {
      DELETE: record => dispatch(this.deleteAction(record, props)),
      PUT: record => dispatch(this.updateAction(record, props)),
      POST: record => dispatch(this.createAction(record, props)),
    };
  }

  // We should move optionsFromState to OkapiResource and override this there
  verbOptions = (verb, state, props) => {
    const options = _.merge({},
      this.optionsTemplate,
      this.optionsTemplate[verb],
      optionsFromState(this.optionsTemplate, state));
    if (options.path && props) {
      const subbed = substitutePath(options.path, props, state, this.module, this.logger);
      if (typeof subbed === 'string') {
        options.path = subbed;
      } else if (typeof options.staticFallback === 'object') {
        _.merge(options, options.staticFallback);
      } else {
        return null;
      }
    }
    return options;
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
    return dispatch(this.fetchAction(props));
  }

  createAction = (record, props) => {
    const that = this;
    const crudActions = this.crudActions;
    return (dispatch, getState) => {
      const options = this.verbOptions('POST', getState(), props);
      if (options === null) return null; // needs dynamic parts that aren't available
      const { root, path, pk, clientGeneratePk, headers } = options;
      const url = [root, path].join('/');
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
        headers,
        body: JSON.stringify(remoteRecord),
      })
        .then((response) => {
          if (response.status >= 400) {
            response.text().then((text) => {
              error(dispatch, 'POST', crudActions.createError, clientRecord, that.module, that.name,
                    { status: response.status, message: text });
            });
          } else {
            response.json().then((json) => {
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

  updateAction = (record, props) => {
    const that = this;
    const crudActions = this.crudActions;
    const clientRecord = { ...record };
    return (dispatch, getState) => {
      const options = this.verbOptions('PUT', getState(), props);
      if (options === null) return null; // needs dynamic parts that aren't available
      const { root, path, pk, headers } = options;
      const url = [root, path].join('/');
      if (clientRecord[pk] && !clientRecord.id) clientRecord.id = clientRecord[pk];
      dispatch(crudActions.updateStart(clientRecord));
      return fetch(url, {
        method: 'PUT',
        headers,
        body: JSON.stringify(record),
      })
        .then((response) => {
          if (response.status >= 400) {
            response.text().then((text) => {
              error(dispatch, 'PUT', crudActions.updateError, record, that.module, that.name,
                    { status: response.status, message: text });
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

  deleteAction = (record, props) => {
    const that = this;
    const crudActions = this.crudActions;
    return (dispatch, getState) => {
      const options = this.verbOptions('DELETE', getState(), props);
      if (options === null) return null; // needs dynamic parts that aren't available
      const { root, path, pk, headers } = options;
      const url = (path.endsWith(record[pk]) ?
                     [root, path].join('/')
                     :
                     [root, path, record[pk]].join('/'));
      const clientRecord = { ...record };
      if (clientRecord[pk] && !clientRecord.id) clientRecord.id = clientRecord[pk];
      dispatch(crudActions.deleteStart(clientRecord));
      return fetch(url, {
        method: 'DELETE',
        headers,
      })
        .then((response) => {
          if (response.status >= 400) {
            response.text().then((text) => {
              error(dispatch, 'DELETE', crudActions.deleteError, clientRecord, that.module, that.name,
                    { status: response.status, message: text });
            });
          } else {
            dispatch(crudActions.deleteSuccess(clientRecord));
          }
        }).catch((reason) => {
          error(dispatch, 'DELETE', crudActions.deleteError, clientRecord, that.module, that.name, reason.message);
        });
    };
  }


  fetchAction = (props) => {
    const that = this;
    const crudActions = this.crudActions;
    const key = this.stateKey();
    return (dispatch, getState) => {
      const options = this.verbOptions('GET', getState(), props);
      if (options === null) return null; // needs dynamic parts that aren't available
      const { root, path, headers, records, clear } = options;
      // i.e. only join truthy elements
      const url = [root, path].filter(_.identity).join('/');
      console.log(url);
      if (url === that.lastUrl) return null; // TODO return a successful promise?
      that.lastUrl = url;

      dispatch(crudActions.fetchStart());
      return fetch(url, { headers })
        .then((response) => {
          if (response.status >= 400) {
            response.text().then((text) => {
              error(dispatch, 'GET', crudActions.fetchError, null, that.module, that.name,
                    { status: response.status, message: text });
            });
          } else {
            response.json().then((json) => {
              if (clear) {
                dispatch({ type: `CLEAR_${key.toUpperCase()}` });
              }
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
