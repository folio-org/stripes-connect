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

// returns null if templated values are incomplete
// if pk is provided append to path if not present
function urlFromOptions(options, pk) {
  const o = Object.assign({}, options);
  if (o.path === null) return null;
  if (o.params === null) return null;

  if (typeof o.params === 'object') {
    // any parameter being null (ie. because template doesn't have a resource it needs)
    // is equivalent to that happening in the path
    if (_.values(o.params).reduce((acc, val) => acc || (val === null), false)) {
      if (typeof o.staticFallback === 'object') {
        _.merge(o, o.staticFallback);
      } else {
        return null;
      }
    }
  }

  if (o.perRequest && o.limitParam) {
    const newParams = {};
    newParams[o.limitParam] = o.perRequest;
    o.params = _.merge({}, o.params, newParams);
  }

  const path = (!pk || o.path.endsWith(pk)) ?
      // // i.e. only join truthy elements
      // const url = [root, path].filter(_.identity).join('/');
    [o.root, o.path].join('/') : [o.root, o.path, pk].join('/');

  if (typeof o.params === 'object') {
    return `${path}?${queryString.stringify(o.params)}`;
  }
  return path;
}

// Implements dynamic manifest components with ?{syntax}. Namespaces so far:
// ? - query parameters in current url
// : - path components as defined by react-router
// $ - resources
//
//
export function substitute(original, props, state, module, logger) {
  const parsedQuery = queryString.parse(_.get(props, ['location', 'search']));
  let dynamicPartsSatisfied = true;
  let result;

  if (typeof original === 'function') {
    // Call back to resource-specific code
    result = original(parsedQuery, _.get(props, ['match', 'params']), mockProps(state, module).data, logger);
    dynamicPartsSatisfied = (result !== null);
  } else if (typeof original === 'string') {
    // eslint-disable-next-line consistent-return
    result = original.replace(/([:?$!]){(.*?)}/g, (match, ns, name) => {
      switch (ns) { // eslint-disable-line default-case
        case '?': {
          const queryParam = processFallback(name, [], parsedQuery);
          if (queryParam === null) dynamicPartsSatisfied = false;
          return queryParam;
        }
        case ':': {
          const pathComp = processFallback(name, ['match', 'params'], props);
          if (pathComp === null) dynamicPartsSatisfied = false;
          return pathComp;
        }
        case '$': {
          const localState = processFallback(name.split('.'), ['data'], mockProps(state, module));
          if (localState === null) dynamicPartsSatisfied = false;
          return localState;
        }
        case '!': {
          const prop = processFallback(name.split('.'), [], props);
          if (prop === null) dynamicPartsSatisfied = false;
          return prop;
        }
      }
    });
  } else {
    throw new Error('Invalid type passed to RESTResource.substitute()');
  }

  logger.log('substitute', `substitute(${
    (typeof original === 'function') ? '<FUNCTION>' : original
  }) -> ${result}, satisfied=${dynamicPartsSatisfied}`);
  return dynamicPartsSatisfied ? result : null;
}

export default class RESTResource {

  constructor(name, query = {}, module = null, logger, defaults = defaultDefaults) {
    this.name = name;
    this.module = module;
    this.logger = logger;
    this.crudName = module ? `${_.snakeCase(module)}_${_.snakeCase(name)}` : _.snakeCase(name);
    this.optionsTemplate = _.merge({}, defaults, query);
    this.crudActions = crud.actionCreatorsFor(this.crudName);
    this.pagedFetchSuccess = this.crudActions.fetchSuccess;
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
    if (props) {
      // path
      if (options.path) {
        const subbed = substitute(options.path, props, state, this.module, this.logger);
        if (typeof subbed === 'string') {
          options.path = subbed;
        } else if (typeof options.staticFallback === 'object') {
          _.merge(options, options.staticFallback);
        } else {
          options.path = null;
        }
      }

      // params
      if (typeof options.params === 'object') {
        options.params = _.mapValues(options.params, param =>
          substitute(param, props, state, this.module, this.logger));
      } else if (typeof options.params === 'function') {
        const parsedQuery = queryString.parse(_.get(props, ['location', 'search']));
        options.params = options.params(parsedQuery, _.get(props, ['match', 'params']), mockProps(state, module).data, this.logger);
      }

      // recordsRequired
      if (typeof options.recordsRequired === 'string' || typeof options.recordsRequired === 'function') {
        const tmplReqd = Number.parseInt(substitute(options.recordsRequired, props, state, this.module, this.logger), 10);
        if (tmplReqd > 0) {
          options.recordsRequired = tmplReqd;
        } else {
          return null;
        }
      }
    }

    return options;
  }

  reducer(state = [], action) {
    switch (action.type) {
      case `${this.stateKey().toUpperCase()}_FETCH_SUCCESS`: {
        if (Array.isArray(action.records)) return [...action.records];
        return [_.clone(action.records)];
      }
      default: {
        return this.crudReducers(state, action);
      }
    }
  }

  pagingReducer = (state = [], action) => {
    switch (action.type) {
      case `${this.stateKey().toUpperCase()}_PAGING_START`: {
        return [];
      }
      case `${this.stateKey().toUpperCase()}_PAGE_START`: {
        const newPage = {
          records: null,
          url: action.meta.url,
          isComplete: false,
        };
        return [...state, newPage];
      }
      case `${this.stateKey().toUpperCase()}_PAGE_SUCCESS`: {
        let allDone = false;
        const newState = state.reduce((acc, val) => {
          allDone = allDone && val.isComplete;
          if (action.meta.url === val.url) {
            return acc.concat(Object.assign({}, val,
              { isComplete: true, records: action.payload }));
          }
          return acc.concat(val);
        }, []);
        return newState;
      }
      default:
        return state;
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
      const { pk, clientGeneratePk, headers } = options;
      const url = urlFromOptions(options);
      if (url === null) return null; // needs dynamic parts that aren't available
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
      const { pk, headers } = options;
      const url = urlFromOptions(options, record[pk]);
      if (url === null) return null;
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
      const { pk, headers } = options;
      const url = urlFromOptions(options, record[pk]);
      if (url === null) return null;
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
      const url = urlFromOptions(options);
      if (url === null) return null;
      const { headers, records } = options;
      // noop if the URL and recordsRequired didn't change
      if (url === that.lastUrl && options.recordsRequired === that.lastReqd) return null;
      that.lastUrl = url;
      that.lastReqd = options.recordsRequired;

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
              const data = (records ? json[records] : json);
              this.logger.log('connect-fetch', `fetch ${key} (${url}) succeeded with`, data);
              const reqd = options.recordsRequired;
              const perPage = options.perRequest;
              const total = json.total_records;
              if (reqd && total && total > perPage && reqd > perPage) {
                dispatch(this.fetchMore(options, total, data, url));
              } else {
                dispatch(crudActions.fetchSuccess(data));
              }
            });
          }
        }).catch((reason) => {
          error(dispatch, 'GET', crudActions.fetchError, null, that.module, that.name, reason.message);
        });
    };
  }

  fetchMore = (options, total, firstData, firstURL) => {
    const { headers, records, recordsRequired: reqd,
            perRequest: limit, offsetParam } = options;
    return (dispatch) => {
      dispatch(this.pagingStart());
      dispatch(this.fetchPageStart(firstURL));
      for (let offset = limit; offset < reqd; offset += limit) {
        const newOptions = {};
        newOptions.params = {};
        newOptions.params[offsetParam] = offset;
        const url = urlFromOptions(_.merge({}, options, newOptions));
        dispatch(this.fetchPageStart(url));
        fetch(url, { headers })
          .then((response) => {
            if (response.status >= 400) {
              // TODO error
            } else {
              response.json().then((json) => {
                const data = (records ? json[records] : json);
                dispatch(this.fetchPageSuccess(url, data));
              });
            }
          }).catch((err) => {
            // TODO error
            console.log('PAGE FETCH ERROR', err);
          });
      }
      dispatch(this.fetchPageSuccess(firstURL, firstData));
    };
  }

  pagingStart = () => ({ type: `${this.stateKey().toUpperCase()}_PAGING_START` })

  fetchPageStart = url => ({
    type: `${this.stateKey().toUpperCase()}_PAGE_START`,
    meta: { url },
  })

  fetchPageSuccess = (url, data) => ({
    type: `${this.stateKey().toUpperCase()}_PAGE_SUCCESS`,
    payload: data,
    meta: { url },
  })
}
