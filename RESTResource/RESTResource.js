import 'isomorphic-fetch'; /* global fetch */
import _ from 'lodash';
import uuid from 'uuid';
import queryString from 'query-string';

import actionCreatorsFor from './actionCreatorsFor';
import reducer from './reducer';

const defaultDefaults = { pk: 'id', clientGeneratePk: true, fetch: true, clear: true };

// RAML module builder keeps changing where it puts the total
// record-count, so we have to look in three different places to be
// safe. *sigh*

function extractTotal(json) {
  if (json.resultInfo !== undefined &&
      json.resultInfo.totalRecords !== undefined) {
    return json.resultInfo.totalRecords;
  } else if (json.totalRecords !== undefined) {
    return json.totalRecords;
  } else if (json.total_records !== undefined) {
    return json.total_records;
  }

  // Single-record fetches do not have a total-records count at all
  return null;
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

// Calculate what the props _would be_ if we went through
// mapStateToProps. If dataKey is included, then we look only at state
// pertaining to that data-key.
//
// If we restructure the state into a per-module hierarchy we
// won't need to go through this dance STRIPES-238
function mockProps(state, module, dataKey, logger) {
  const mock = { resources: {} };
  logger.log('mock', 'mockProps with state', state);
  Object.keys(state).forEach((key) => {
    logger.log('mock', `  considering ${key}`);
    const a = key.split('#');
    let rawKey;
    if (a.length === 1) {
      // No dataKey
      if (!dataKey) rawKey = key;
    } else {
      if (a.length > 2) logger.log('mock', `state key '${key}' has multiple '#'`);
      // 1st component is dataKey
      if (dataKey && dataKey === a[0]) rawKey = a[1];
    }

    logger.log('mock', `   considering rawKey ${rawKey}`);
    if (!rawKey) {
      logger.log('mock', '    skipping');
    } else {
      const re = new RegExp(`^${_.snakeCase(module)}.(.*)`);
      const res = re.exec(rawKey);
      if (Array.isArray(res) && res.length > 1) {
        mock.resources[res[1]] = state[key];
        logger.log('mock', `    added mock[${res[1]}] =`, state[key]);
      } else {
        logger.log('mock', `    cannot pick apart key '${rawKey}'`);
      }
    }
  });
  logger.log('mock', 'mockProps returning', mock);
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

  const path = (!pk || o.path.endsWith(pk)) ?
    // // i.e. only join truthy elements
    // const url = [root, path].filter(_.identity).join('/');
    [o.root, o.path].join('/') : [o.root, o.path, pk].join('/');

  if (typeof o.params === 'object') {
    return `${path}?${queryString.stringify(o.params)}`;
  }
  return path;
}

// Process string template with ?{syntax}. Namespaces so far:
// ? - query parameters in current url
// : - path components as defined by react-router
// $ - resources
// ! - properties
export function compilePathTemplate(template, parsedQuery, props, localProps) {
  let dynamicPartsSatisfied = true;

  const result = template.replace(/([?:$%!]){(.*?)}/g, (match, ns, name) => {
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
      case '%': case '$': {
        const localState = processFallback(name.split('.'), [], localProps);
        if (localState === null) dynamicPartsSatisfied = false;
        return localState;
      }
      case '!': {
        const prop = processFallback(name.split('.'), [], props);
        if (prop === null) dynamicPartsSatisfied = false;
        return prop;
      }
      default: {
        dynamicPartsSatisfied = false;
        return null;
      }
    }
  });
  return dynamicPartsSatisfied ? result : null;
}


// This now takes so many arguments that it really ought to be a
// method of RESTResource rather than a standalone function that is
// passed various parts of the RESTResource object. But since it's
// exported as a function, I don't want to mess with it until I know
// what uses it.
//
export function substitute(original, props, state, module, logger, dataKey) {
  const parsedQuery = queryString.parse(_.get(props, ['location', 'search']));
  let result;
  const localProps = mockProps(state, module, props.dataKey || dataKey, logger).resources;
  if (typeof original === 'function') {
    // Call back to resource-specific code
    result = original(parsedQuery, _.get(props, ['match', 'params']), localProps, logger);
  } else if (typeof original === 'string') {
    // eslint-disable-next-line consistent-return
    result = compilePathTemplate(original, parsedQuery, props, localProps);
  } else {
    throw new Error('Invalid type passed to RESTResource.substitute()');
  }

  logger.log('substitute', `substitute(${
    (typeof original === 'function') ? '<FUNCTION>' : original
  }) -> ${result}, satisfied=${result !== null}`);

  return result;
}

export default class RESTResource {
  constructor(name, query = {}, module = null, logger, dataKey, defaults = defaultDefaults) {
    this.name = name;
    this.module = module;
    this.logger = logger;
    this.dataKey = dataKey;
    this.crudName = module ? `${_.snakeCase(module)}_${_.snakeCase(name)}` : _.snakeCase(name);
    this.optionsTemplate = _.merge({}, defaults, query);
    this.optionsFromState = query.optionsFromState || (() => undefined);
    this.throwErrors = query.throwErrors === undefined ? true : query.throwErrors;
    this.actions = actionCreatorsFor(this);
    this.pagedFetchSuccess = this.actions.fetchSuccess;
    this.reducer = reducer.bind(this);
  }

  getMutator(dispatch, props) {
    const actions = {
      DELETE: record => dispatch(this.deleteAction(record, props)),
      PUT: record => dispatch(this.updateAction(record, props)),
      POST: record => dispatch(this.createAction(record, props)),
    };

    if (this.optionsTemplate.accumulate) {
      return Object.assign(actions, {
        GET: options => dispatch(this.accFetch(options, props)),
        reset: () => dispatch(this.actions.reset()),
      });
    }
    return actions;
  }

  // We should move optionsFromState to OkapiResource and override this there
  verbOptions = (verb, state, props) => {
    const options = _.merge({},
      this.optionsTemplate,
      this.optionsTemplate[verb],
      this.optionsFromState(this.optionsTemplate, state));
    if (props) {
      // path
      if (options.path) {
        const subbed = substitute(options.path, props, state, this.module, this.logger, this.dataKey);
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
          substitute(param, props, state, this.module, this.logger, this.dataKey));
        for (const key of Object.keys(options.params)) {
          if (options.params[key] === null) {
            return null;
          }
        }
      } else if (typeof options.params === 'function') {
        const parsedQuery = queryString.parse(_.get(props, ['location', 'search']));
        options.params = options.params(parsedQuery, _.get(props, ['match', 'params']), mockProps(state, module, props.dataKey, this.logger).data, this.logger);
      }

      // recordsRequired
      if (typeof options.recordsRequired === 'string' || typeof options.recordsRequired === 'function') {
        const tmplReqd = Number.parseInt(substitute(options.recordsRequired, props, state, this.module, this.logger, this.dataKey), 10);
        if (tmplReqd > 0) {
          options.recordsRequired = tmplReqd;
        } else {
          return null;
        }
      }

      // records
      if (options.records) {
        options.records = substitute(options.records, props, state, this.module, this.logger, this.dataKey);
      }
    }

    if (options.perRequest && options.limitParam && verb === 'GET') {
      options.params = _.merge({}, options.params, { [options.limitParam]: options.perRequest });
    }

    return options;
  }

  pagingReducer = (state = [], action) => {
    if (!action.type.startsWith('@@stripes-connect')
      || action.meta.module !== this.module
      || action.meta.resource !== this.name
      || action.meta.dataKey !== this.dataKey) return state;
    switch (action.type) {
      case '@@stripes-connect/PAGING_START': {
        return [];
      }
      case '@@stripes-connect/PAGE_START': {
        const newPage = {
          records: null,
          url: action.url,
          meta: null,
          isComplete: false,
        };
        return [...state, newPage];
      }
      case '@@stripes-connect/PAGE_SUCCESS': {
        let allDone = false;
        const newState = state.reduce((acc, val) => {
          allDone = allDone && val.isComplete;
          if (action.meta.url === val.url) {
            return acc.concat(Object.assign({}, val,
              { isComplete: true, records: action.payload, meta: action.meta }));
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
    return `${this.dataKey ? `${this.dataKey}#` : ''}${this.crudName}`;
  }

  refresh(dispatch, props) {
    if (this.optionsTemplate.accumulate === true) return;
    if (this.optionsTemplate.fetch === false) return;
    if (props.dataKey === this.dataKey) dispatch(this.fetchAction(props));
    this.dispatch = dispatch;
    this.cachedProps = { ...props, sync: true };
  }

  sync() {
    if (!this.dispatch || !this.cachedProps) return;
    this.dispatch(this.fetchAction(this.cachedProps));
  }

  hasMissingPerms(state, perms) {
    const currentPerms = _.get(state, ['okapi', 'currentPerms'], {});
    const reqPerms = _.isArray(perms) ? perms : perms.split(',');
    return reqPerms.filter(perm => !currentPerms[perm]);
  }

  createAction = (record, props) => (dispatch, getState) => {
    const options = this.verbOptions('POST', getState(), props);
    const { pk, clientGeneratePk, headers } = options;
    const url = urlFromOptions(options);
    if (url === null) return null; // needs dynamic parts that aren't available
    // Optimistic record creation ('clientRecord')
    const clientGeneratedId = record.id ? record.id : uuid();
    const clientRecord = { ...record, id: clientGeneratedId };
    clientRecord[pk] = clientGeneratedId;
    dispatch(this.actions.createStart(clientRecord));
    // Prepare record for remote
    const remoteRecord = { ...record };
    if (clientGeneratePk) {
      remoteRecord[pk] = clientGeneratedId;
    }
    // Send remote record
    const beforeCatch = fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(remoteRecord),
    }).then((response) => {
      if (response.status >= 400) {
        const clonedResponse = response.clone();
        dispatch(this.mutationHTTPError(response, 'POST'));
        // fetch responses are single-use so we use the one above and throw a different
        // one for catch() to play with
        throw clonedResponse;
      } else {
        const contentType = response.headers.get('Content-Type');
        if (contentType && contentType.startsWith('application/json')) {
          return response.json().then((json) => {
            const responseRecord = { ...json };
            if (responseRecord[pk] && !responseRecord.id) responseRecord.id = responseRecord[pk];
            dispatch(this.actions.createSuccess(responseRecord, clientGeneratedId));
            return responseRecord;
          });
        }
        // Response is not JSON; maybe no body at all. Assume the client-record is good enough
        dispatch(this.actions.createSuccess(clientRecord, clientGeneratedId));
        return clientRecord;
      }
    });

    beforeCatch.catch((reason) => {
      if (typeof reason === 'object') {
        // we've already handled HTTP errors above and want to leave fetch()'s
        // single-use promise for getting them message body available for external
        // catch()
        if (!reason.status && !reason.headers) {
          dispatch(this.mutationError({ message: reason.message }, 'POST'));
        }
      } else {
        dispatch(this.mutationError({ message: reason }, 'POST'));
      }
    });

    return beforeCatch;
  }

  updateAction = (record, props) => {
    const clientRecord = { ...record };
    return (dispatch, getState) => {
      const options = this.verbOptions('PUT', getState(), props);
      const { pk, headers } = options;
      const url = urlFromOptions(options, record[pk]);
      if (url === null) return null;
      if (clientRecord[pk] && !clientRecord.id) clientRecord.id = clientRecord[pk];
      dispatch(this.actions.updateStart(clientRecord));
      const beforeCatch = fetch(url, {
        method: 'PUT',
        headers,
        body: JSON.stringify(record),
      })
        .then((response) => {
          if (response.status >= 400) {
            const clonedResponse = response.clone();
            dispatch(this.mutationHTTPError(response, 'PUT'));
            throw clonedResponse;
          } else {
            /* Patrons api will not return JSON
            response.json().then ( (json) => {
              if (json[options.pk] && !json.id) json.id = json[options.pk];
              dispatch(crudActions.updateSuccess(json));
            });
            */
            dispatch(this.actions.updateSuccess(clientRecord));
            return clientRecord;
          }
        });

      beforeCatch.catch((reason) => {
        if (typeof reason === 'object' && !reason.status && !reason.headers) {
          dispatch(this.actions.mutationError({ message: reason.message }, 'PUT'));
        }
      });

      return beforeCatch;
    };
  }

  deleteAction = (record, props) => (dispatch, getState) => {
    const options = this.verbOptions('DELETE', getState(), props);
    if (options === null) return null; // needs dynamic parts that aren't available
    const { pk, headers } = options;
    const url = urlFromOptions(options, record[pk]);
    if (url === null) return null;
    const clientRecord = { ...record };
    if (clientRecord[pk] && !clientRecord.id) clientRecord.id = clientRecord[pk];
    dispatch(this.actions.deleteStart(clientRecord));
    const beforeCatch = fetch(url, {
      method: 'DELETE',
      headers,
    })
      .then((response) => {
        if (response.status >= 400) {
          const clonedResponse = response.clone();
          dispatch(this.mutationHTTPError(response, 'DELETE'));
          throw clonedResponse;
        } else {
          dispatch(this.actions.deleteSuccess(clientRecord));
        }
      });

    beforeCatch.catch((reason) => {
      if (typeof reason === 'object' && !reason.status && !reason.headers) {
        dispatch(this.mutationError({ message: reason.message }, 'DELETE'));
      }
    });

    return beforeCatch;
  }

  fetchAction = (props) => {
    const key = this.stateKey();

    return (dispatch, getState) => {
      const state = getState();
      const options = this.verbOptions('GET', state, props);

      if (options === null) {
        dispatch(this.actions.fetchAbort({ message: 'cannot satisfy request: missing query?' }));
        this.lastUrl = null;
        return null; // needs dynamic parts that aren't available
      }

      if (options.permissionsRequired) {
        const missingPerms = this.hasMissingPerms(state, options.permissionsRequired);
        if (missingPerms.length) {
          dispatch(this.actions.fetchAbort({ message: `missing permissions: ${missingPerms.join(',')}` }));
          return null;
        }
      }

      const url = urlFromOptions(options);
      if (url === null) {
        this.lastUrl = null;
        return null;
      }

      const { headers, records, resourceShouldRefresh } = options;
      // Check for existence of resourceShouldRefresh
      if (_.isUndefined(resourceShouldRefresh)) {
        // Maintain backward compatability if undefined maintin code
        // noop if the URL and recordsRequired didn't change
        this.logger.log('connect-dup', `'${this.name}' reqd=${options.recordsRequired} (${options.recordsRequired === this.lastReqd ? 'same' : 'different'}) ${url}, (${url === this.lastUrl ? 'same' : 'different'})`);
        if (!props.sync && url === this.lastUrl && options.recordsRequired === this.lastReqd) return null;
      } else {
        // Check if resourceShouldRefresh is a boolean or function
        if (_.isBoolean(resourceShouldRefresh) && !resourceShouldRefresh) return null;
        // Function should return a boolean!
        if (_.isFunction(resourceShouldRefresh) && !resourceShouldRefresh()) return null;
      }
      this.lastUrl = url;
      this.lastReqd = options.recordsRequired;

      dispatch(this.actions.fetchStart());
      return fetch(url, { headers })
        .then((response) => {
          if (response.status >= 400) {
            dispatch(this.fetchHTTPError(response));
          } else {
            response.json().then((json) => {
              // We are only interested in the response to our most recent request
              // TODO: request identifiers will help us avoid the extra string manipulation
              // and will be useful for retries
              if (decodeURI(response.url) !== decodeURI(this.lastUrl)) {
                this.logger.log('connect', `Response ${response.url} does not match most recent request ${this.lastUrl}`);
                return;
              }
              const data = (records ? json[records] : json);
              this.logger.log('connect-fetch', `fetch ${key} (${url}) succeeded with`, data);
              if (!data) {
                dispatch(this.actions.fetchError({ message: `no records in '${records}' element` }));
                return;
              }
              const reqd = options.recordsRequired;
              const perPage = options.perRequest;
              const total = extractTotal(json);
              const meta = {
                url: response.url,
                headers: response.headers,
                httpStatus: response.status,
                other: records ? _.omit(json, records) : {},
              };

              if (meta.other) meta.other.totalRecords = total;
              if (reqd && total && total > perPage && reqd > perPage) {
                dispatch(this.fetchMore(options, total, data, meta));
              } else {
                dispatch(this.actions.fetchSuccess(meta, data));
              }
            });
          }
        }).catch((reason) => {
          dispatch(this.actions.fetchError({ message: reason.message }));
        });
    };
  }

  fetchMore = (options, total, firstData, firstMeta) => {
    const { headers, records, recordsRequired,
      perRequest: limit, offsetParam } = options;
    const reqd = Math.min(recordsRequired, total);
    return (dispatch) => {
      dispatch(this.actions.pagingStart());
      dispatch(this.actions.pageStart(firstMeta.url));
      for (let offset = limit; offset < reqd; offset += limit) {
        const newOptions = {};
        newOptions.params = {};
        newOptions.params[offsetParam] = offset;
        const url = urlFromOptions(_.merge({}, options, newOptions));
        dispatch(this.actions.pageStart(url));
        fetch(url, { headers })
          .then((response) => {
            if (response.status >= 400) {
              dispatch(this.fetchHTTPError(response));
            } else {
              response.json().then((json) => {
                const meta = {
                  url: response.url,
                  headers: response.headers,
                  httpStatus: response.status,
                  other: records ? _.omit(json, records) : {},
                };
                if (meta.other) meta.other.totalRecords = extractTotal(json);
                const data = (records ? json[records] : json);
                dispatch(this.actions.pageSuccess(meta, data));
              });
            }
          }).catch((err) => {
            dispatch(this.actions.fetchError({
              message: `Unexpected fetch error ${err}`,
            }));
          });
      }
      dispatch(this.actions.pageSuccess(firstMeta, firstData));
    };
  }

  accFetch = (paramOpts, props) => {
    const key = this.stateKey();
    return (dispatch, getState) => {
      const options = Object.assign(this.verbOptions('GET', getState(), props), paramOpts);
      if (options === null) return null; // needs dynamic parts that aren't available
      const url = urlFromOptions(options);
      if (url === null) return null;
      const { headers, records } = options;
      dispatch(this.actions.fetchStart());

      const beforeCatch = fetch(url, { headers })
        .then(response => response.text()
          .then((text) => {
            if (response.status >= 400) {
              const err = {
                message: text || response.statusText,
                httpStatus: response.status,
              };
              dispatch(this.actions.fetchError(err));
              throw err;
            }
            const json = JSON.parse(text);
            const data = (records ? json[records] : json);
            this.logger.log('connect-fetch', `accFetch ${key} (${url}) succeeded with`, data);
            if (!data) {
              const err = { message: `no records in '${records}' element` };
              dispatch(this.actions.fetchError(err));
              throw err;
            }
            const meta = {
              url: response.url,
              headers: response.headers,
              httpStatus: response.status,
              other: records ? _.omit(json, records) : {},
            };
            dispatch(this.actions.accFetchSuccess(meta, data));
            return data;
          }));

      beforeCatch.catch((reason) => {
        dispatch(this.actions.fetchError({ message: reason.message }));
      });

      return beforeCatch;
    };
  }

  fetchHTTPError = res => dispatch => res.text().then((text) => {
    dispatch(this.actions.fetchError({
      message: text || res.statusText,
      httpStatus: res.status,
    }));
  });

  mutationHTTPError = (res, mutator) => dispatch => res.text().then((text) => {
    dispatch(this.actions.mutationError({
      message: text || res.statusText,
      httpStatus: res.status,
    }, mutator));
  });
}
