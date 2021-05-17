import _ from 'lodash';
import uuid from 'uuid';
import queryString from 'query-string';

import actionCreatorsFor from './actionCreatorsFor';
import reducer from './reducer';

const defaultDefaults = {
  pk: 'id',
  clientGeneratePk: true,
  fetch: true,
  clear: true,
  abortable: false,
  abortOnUnmount: false,
};

/**
 * extractTotal
 * Find the current incarnation of "totalRecords" and return it.
 * RAML module builder keeps changing where it puts the total
 * record-count, so we have to look in three different places to be
 * safe. *sigh*
 *
 * @param json object
 * @return int
 */
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

/**
 * processFallback
 * handle bash-like substitution fallbacks in path interpretation for a
 * single substring
 * Substitions of the form
 *     ?{name:+val}
 * and
 *     ?{name:-val}
 * allow the string "val" to be provided when "name" is or is not provided,
 * respectively. See the "Parameter Expansion" section of the Bash manual
 * for more details. This minimal handling is what we need right now, but
 * we should consider implementing all of it. And needless to say, it
 * should apply to all kinds of substitutable.
 *
 * @param s string value to inspect for interpolation
 * @param getPath array
 * @param props object props containing substitutable values
 *
 * @return string
 */
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

/**
 * mockProps
 * Calculate what the props _would be_ if we went through
 * mapStateToProps. If dataKey is included, then we look only at state
 * pertaining to that data-key.
 *
 * If we restructure the state into a per-module hierarchy we
 * won't need to go through this dance STRIPES-238
 */
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

/**
 * urlFromOptions
 * Construct a URL path given its constituent parts. Returns null if the
 * values for path or params are incomplete. If the pk is provided and
 * not already present in the URL, append it.
 *
 * @param options object of the shape { path, params, [staticFallback]}
 * @param [pk] string a UUID presumably corresponding to a primary key
 *
 * @return string
 */
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

/**
 * compilePathTemplate
 * Process string template with ?{syntax}. Namespaces so far:
 *   ? - query parameters in current url
 *   : - path components as defined by react-router
 *   % - resources ($ is deprecated in favor of %)
 *   ! - properties
 *
 * @param template string
 * @param parsedQuery object querystring's key-value pairs as an object
 * @param props object props passed into original component
 * @param localProps object local resources
 *
 * @return string
 */
export function compilePathTemplate(template, parsedQuery, props, localProps) {
  let dynamicPartsSatisfied = true;

  const result = template.replace(/([?:$%!]){(.*?)}/g, (match, ns, name) => {
    switch (ns) {
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

/**
 * substitute
 * This now takes so many arguments that it really ought to be a
 * method of RESTResource rather than a standalone function that is
 * passed various parts of the RESTResource object. But since it's
 * exported as a function, I don't want to mess with it until I know
 * what uses it.
 *
 * @param original string
 * @param props object
 * @param state object
 * @param module string name of the module the resource is affiliated with
 * @param logger object a logger
 * @param dataKey string unique key to disambiguate this resource from another
 * which otherwise has the same attributes
 *
 * @return string
 */
export function substitute(original, props, state, module, logger, dataKey) {
  const parsedQuery = queryString.parse(_.get(props, ['location', 'search']));
  let result;
  const localProps = mockProps(state, module, props.dataKey || dataKey, logger).resources;
  if (typeof original === 'function') {
    // Call back to resource-specific code
    result = original(parsedQuery, _.get(props, ['match', 'params']), localProps, logger, props);
  } else if (typeof original === 'string') {
    result = compilePathTemplate(original, parsedQuery, props, localProps);
  } else if (typeof original === 'boolean') {
    result = original;
  } else {
    throw new Error(`Invalid type passed to RESTResource.substitute(): ${typeof original} (${original})`);
  }

  logger.log('substitute', `substitute(${(typeof original === 'function') ? '<FUNCTION>' : original}) -> ${result}, satisfied=${result !== null}`);

  return result;
}

/**
 * buildOption
 * Some manifest options properties may be an object or a function, determine which
 * the passed property is and act accordingly
 *
 * @param option object or function
 * @param props object
 * @param state object
 * @param module string name of the module the resource is affiliated with
 * @param logger object a logger
 * @param dataKey string unique key to disambiguate this resource from another
 * which otherwise has the same attributes
 *
 * @return object
 */

export function buildOption(option, props, state, module, logger, dataKey) {
  let toReturn;
  if (typeof option === 'object') {
    toReturn = _.mapValues(
      option,
      param => substitute(param, props, state, module, logger, dataKey)
    );
    // If any of the option properties have null values, we can't go any further
    const someParamIsNull = Object.values(toReturn).some(value => value === null);
    if (someParamIsNull) {
      toReturn = null;
    }
  } else if (typeof option === 'function') {
    const parsedQuery = queryString.parse(props.location?.search);
    toReturn = option(parsedQuery, props.match?.params, mockProps(state, module, dataKey, logger).resources, logger, props);
  }
  return toReturn;
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
    this.abortControllers = {};
  }

  getMutator(dispatch, props) {
    const actions = {
      DELETE: (record, opts) => dispatch(this.deleteAction(record, props, opts)),
      PUT: (record, opts) => dispatch(this.updateAction(record, props, opts)),
      POST: (record, opts) => dispatch(this.createAction(record, props, opts)),
      cancel: () => this.cancelRequests(),
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

      // Build params
      options.params = buildOption(options.params, props, state, this.module, this.logger, this.dataKey);
      if (options.params === null) return null;

      // Build headers
      options.headers = buildOption(options.headers, props, state, this.module, this.logger, this.dataKey);

      // recordsRequired
      if (typeof options.recordsRequired === 'string' || typeof options.recordsRequired === 'function') {
        const tmplReqd = Number.parseInt(substitute(options.recordsRequired, props, state, this.module, this.logger, this.dataKey), 10);
        if (tmplReqd > 0) {
          options.recordsRequired = tmplReqd;
        } else {
          return null;
        }
      }

      // resultOffset
      if (typeof options.resultOffset === 'string' || typeof options.resultOffset === 'function') {
        const tmplResultOffset = Number.parseInt(substitute(options.resultOffset, props, state, this.module, this.logger, this.dataKey), 10);
        if (tmplResultOffset >= 0) {
          options.resultOffset = tmplResultOffset;
        } else {
          return null;
        }
      }

      // records
      if (options.records) {
        options.records = substitute(options.records, props, state, this.module, this.logger, this.dataKey);
      }

      if (options.clientGeneratePk) {
        options.clientGeneratePk = substitute(options.clientGeneratePk, props, state, this.module, this.logger, this.dataKey);
      }
    }

    /* if params is not null and perRequest is passed as an option, then add the limit param and trigger a fetch.
       If params is returned as null, then do not add the limit param and prevent a fetch.
       NOTE: If params is undefined (default case when params option is not passed to the resource via the manifest),
       the limit param is added and triggers a fetch like it should. */
    if (options.params !== null && options.perRequest && options.limitParam && verb === 'GET') {
      if (typeof options.perRequest === 'string' || typeof options.perRequest === 'function') {
        const perRequest = Number.parseInt(substitute(options.perRequest, props, state, this.module, this.logger, this.dataKey), 10);
        if (perRequest >= 0) {
          options.perRequest = perRequest;
        } else {
          return options;
        }
      }
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

          // Handle the situation where we accidentally ask for more pages
          // than there are in the set, i.e. we query for offset=120 when
          // there are only 100 records in a set. Why, why would we issue
          // such a query? It's complicated.
          //
          // In short, calculating the size of result sets can be expensive,
          // so there's a heuristic, but sometimes it's very, very, VERY wrong.
          // When Okapi thinks the result set will contain > 10k rows, it
          // returns totalCount=999999999 to indicate "Ah'm just guessin'
          // because the real number is wicked huge." The problem is that if
          // we start paging through one of these supposedly-wicked-huge
          // result sets and fall off the end of it, we'll then get response
          // with totalCount=0.
          //
          // When we receive totalCount=0 in the middle of paging, we dispatch
          // a success, but with an added meta property the allows us to figure
          // out what on earth just happened, dropping you here.
          //
          // So this is how it is: all we need to do here is set
          // isComplete=true. The rest of the work has already been done.
          //
          if (action.meta.bonkersOkapiCannotCount) {
            return acc.concat(Object.assign({}, val, { isComplete: true }));
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

  // check if the given manifest has a path with
  // the property namespace !{syntax} or if path or params are functions
  // or if params is an object with values which contain the property namespace
  hasPropNamespace = _.memoize(() => {
    const { path, params } = _.merge({}, this.optionsTemplate, this.optionsTemplate.GET);
    const ns = '!{';

    return (_.isString(path) && path.match(ns)) ||
      _.isFunction(path) || _.isFunction(params) ||
      (_.isObject(params) && !_.isEmpty(_.pickBy(params, param => _.isString(param) && param.match(ns))));
  });

  shouldRefresh(props, nextProps, state) {
    if (!this.hasPropNamespace()) {
      return false;
    }

    const opts = this.verbOptions('GET', state, props);
    const nextOpts = this.verbOptions('GET', state, nextProps);

    const fetch = opts && (typeof opts.fetch === 'function' ? opts.fetch(props) : opts.fetch);
    const nextFetch = nextOpts && (typeof nextOpts.fetch === 'function' ? nextOpts.fetch(nextProps) : nextOpts.fetch);

    return (
      opts && nextOpts &&
      (
        opts.path !== nextOpts.path ||
        !_.isEqual(opts.params, nextOpts.params) ||
        (!fetch && nextFetch)
      )
    );
  }

  refresh(dispatch, props) {
    const opt = this.optionsTemplate;
    if (opt.accumulate === true
      || opt.fetch === false
      || (typeof opt.fetch === 'function'
        && opt.fetch(props) !== true)
    ) return;
    if (props.dataKey === this.dataKey) dispatch(this.fetchAction(props));
    this.dispatch = dispatch;
    this.cachedProps = { ...props, sync: true };
  }

  sync() {
    if (!this.dispatch || !this.cachedProps) return;
    this.dispatch(this.fetchAction(this.cachedProps));
  }

  // Check if the given resource should be reset when a connected
  // component is being unmounted.
  shouldReset() {
    const { resourceShouldRefresh } = this.optionsTemplate;

    return (_.isBoolean(resourceShouldRefresh) && resourceShouldRefresh)
      || (_.isFunction(resourceShouldRefresh) && resourceShouldRefresh());
  }

  // resets redux store attached to this resource
  reset() {
    if (!this.dispatch) return;
    this.dispatch(this.actions.reset());
  }

  addAbortController(key, options) {
    if (!options.abortable && !options.abortOnUnmount) {
      return null;
    }

    const ctrl = new window.AbortController();
    const { signal } = ctrl;

    this.abortControllers[key] = ctrl;

    return signal;
  }

  cancelRequestsOnUnmout() {
    const { abortOnUnmount } = this.optionsTemplate;

    if (abortOnUnmount) {
      this.cancelRequests();
    }
  }

  cancelRequests() {
    Object.values(this.abortControllers).forEach(ctrl => ctrl.abort());
    this.abortControllers = {};
  }

  hasMissingPerms(state, perms) {
    const currentPerms = _.get(state, ['okapi', 'currentPerms'], {});
    const reqPerms = _.isArray(perms) ? perms : perms.split(',');
    return reqPerms.filter(perm => !currentPerms[perm]);
  }

  getMeta(options) {
    const { path, silent } = options;
    return {
      path,
      silent,
    };
  }

  createAction = (record, props, opts) => (dispatch, getState) => {
    const options = this.verbOptions('POST', getState(), { clientGeneratePk: true, ...props });
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

    const signal = this.addAbortController('create', options);

    // Send remote record
    const beforeCatch = fetch(url, {
      method: 'POST',
      headers,
      signal,
      body: JSON.stringify(remoteRecord),
    }).then((response) => {
      if (response.status >= 400) {
        const clonedResponse = response.clone();
        dispatch(this.mutationHTTPError(response, 'POST', this.getActionMeta(options.POST)));
        // fetch responses are single-use so we use the one above and throw a different
        // one for catch() to play with
        throw clonedResponse;
      } else {
        const contentType = response.headers.get('Content-Type');
        const meta = this.getMeta({ ...options, ...opts });

        if (contentType && contentType.startsWith('application/json')) {
          return response.json().then((json) => {
            const responseRecord = { ...json };
            if (responseRecord[pk] && !responseRecord.id) responseRecord.id = responseRecord[pk];
            dispatch(this.actions.createSuccess(meta, responseRecord, clientGeneratedId));
            return responseRecord;
          });
        }

        // Response is not JSON; maybe no body at all. Assume the client-record is good enough

        dispatch(this.actions.createSuccess(meta, clientRecord, clientGeneratedId));
        return clientRecord;
      }
    });

    beforeCatch.catch((reason) => {
      if (typeof reason === 'object') {
        // we've already handled HTTP errors above and want to leave fetch()'s
        // single-use promise for getting them message body available for external
        // catch()
        if (!reason.status && !reason.headers) {
          dispatch(this.actions.mutationError({ message: reason.message }, 'POST', this.getActionMeta(options.POST)));
        }
      } else {
        dispatch(this.actions.mutationError({ message: reason }, 'POST', this.getActionMeta(options.POST)));
      }
    });

    return beforeCatch;
  }

  updateAction = (record, props, opts) => {
    const clientRecord = { ...record };

    return (dispatch, getState) => {
      const options = this.verbOptions('PUT', getState(), props);
      const { pk, headers } = options;
      const url = urlFromOptions(options, record[pk]);
      if (url === null) return null;
      if (clientRecord[pk] && !clientRecord.id) clientRecord.id = clientRecord[pk];
      dispatch(this.actions.updateStart(clientRecord));

      const signal = this.addAbortController('update', options);

      const beforeCatch = fetch(url, {
        method: 'PUT',
        headers,
        signal,
        body: JSON.stringify(record),
      })
        .then((response) => {
          if (response.status >= 400) {
            const clonedResponse = response.clone();
            dispatch(this.mutationHTTPError(response, 'PUT', this.getActionMeta(options.PUT)));
            throw clonedResponse;
          } else {
            const meta = this.getMeta({ ...options, ...opts });

            // The PUT mutator will return the response from the backend if it is JSON, working
            // off the assumption that the response is (or at least contains) the updated record.
            // If the response is not JSON, it will return the client record that was
            // sent to the backend.
            // Note that this may be different from what was passed into the PUT (due to the id/pk finessing),
            // or different from what was actually saved on the backend (due to backend implementations).
            const contentType = (response.headers && response.headers.get('Content-Type')) || '';
            if (contentType.startsWith('application/json')) {
              return response
                .json()
                .then(responseRecord => {
                  dispatch(this.actions.updateSuccess(meta, responseRecord));
                  return responseRecord;
                });
            } else {
              dispatch(this.actions.updateSuccess(meta, clientRecord));
              return clientRecord;
            }
          }
        });

      beforeCatch.catch((reason) => {
        if (typeof reason === 'object' && !reason.status && !reason.headers) {
          dispatch(this.actions.mutationError({ message: reason.message }, 'PUT', this.getActionMeta(options.PUT)));
        }
      });

      return beforeCatch;
    };
  }

  deleteAction = (record, props, opts) => (dispatch, getState) => {
    const options = this.verbOptions('DELETE', getState(), props);
    if (options === null) return null; // needs dynamic parts that aren't available
    const { pk, headers } = options;
    const url = urlFromOptions(options, record[pk]);
    if (url === null) return null;
    const clientRecord = { ...record };
    if (clientRecord[pk] && !clientRecord.id) clientRecord.id = clientRecord[pk];
    dispatch(this.actions.deleteStart(clientRecord));

    const signal = this.addAbortController('remove', options);

    const beforeCatch = fetch(url, {
      method: 'DELETE',
      headers,
      signal,
    })
      .then((response) => {
        if (response.status >= 400) {
          const clonedResponse = response.clone();
          dispatch(this.mutationHTTPError(response, 'DELETE', this.getActionMeta(options.DELETE)));
          throw clonedResponse;
        } else {
          const meta = this.getMeta({ ...options, ...opts });
          dispatch(this.actions.deleteSuccess(meta, clientRecord));
        }
      });

    beforeCatch.catch((reason) => {
      if (typeof reason === 'object' && !reason.status && !reason.headers) {
        dispatch(this.actions.mutationError({ message: reason.message }, 'DELETE', this.getActionMeta(options.DELETE)));
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
      const requestIndex = options.resultOffset >= 0 ? options.resultOffset : options.recordsRequired;

      // Check for existence of resourceShouldRefresh
      if (_.isUndefined(resourceShouldRefresh)) {
        // Maintain backward compatability if undefined maintin code
        // noop if the URL and recordsRequired didn't change
        this.logger.log('connect-dup', `'${this.name}' reqd=${requestIndex} (${requestIndex === this.lastReqd ? 'same' : 'different'}) ${url}, (${url === this.lastUrl ? 'same' : 'different'})`);
        if (!props.sync && url === this.lastUrl && requestIndex === this.lastReqd) return null;
      } else {
        // Check if resourceShouldRefresh is a boolean or function
        if (_.isBoolean(resourceShouldRefresh) && !resourceShouldRefresh) return null;
        // Function should return a boolean!
        if (_.isFunction(resourceShouldRefresh) && !resourceShouldRefresh()) return null;
      }
      this.lastUrl = url;
      this.lastReqd = requestIndex;

      dispatch(this.actions.fetchStart());

      const signal = this.addAbortController('fetch', options);

      return fetch(url, { headers, signal })
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
              const data = (records ? _.get(json, records) : json);
              this.logger.log('connect-fetch', `fetch ${key} (${url}) succeeded with`, data);
              if (!data) {
                dispatch(this.actions.fetchError({ message: `no records in '${records}' element` }));
                return;
              }
              const reqd = requestIndex;
              const perPage = options.perRequest;
              const total = extractTotal(json);
              const meta = {
                url: response.url,
                headers: response.headers,
                httpStatus: response.status,
                other: records ? _.omit(json, records) : {},
              };

              if (meta.other) meta.other.totalRecords = total;
              if (reqd && total && total > perPage && reqd >= perPage) {
                if (options.resultOffset >= 0) { // fetch one page by offset
                  dispatch(this.fetchPageByOffset(options, total));
                } else { // fetch all pages by total count
                  dispatch(this.fetchMore(options, total, data, meta));
                }
              } else {
                dispatch(this.actions.fetchSuccess(meta, data));
                // restart paging if there is any, otherwise any cached pages will
                // populate the UI the next time the connected component mounts.
                dispatch(this.actions.pagingStart());
              }
            });
          }
        }).catch((reason) => this.handleFetchOrAbortError(reason, dispatch));
    };
  }

  // Fetches a single page by offset adding it to the existing result list in redux
  fetchPageByOffset = (options, total) => {
    const { headers, records, resultOffset, offsetParam, outputFormat } = options;
    const reqd = Math.min(resultOffset, total);
    const key = this.stateKey();

    return (dispatch, getState) => {
      const state = getState();
      const newOptions = {};
      newOptions.params = {};
      newOptions.params[offsetParam] = reqd;
      const url = urlFromOptions(_.merge({}, options, newOptions));
      const requestIndex = options.resultOffset >= 0 ? options.resultOffset : options.recordsRequired;
      const { url: offsetUrl, offset } = state?.[key] ?? {};

      // If the offset in the current request matches the resultOffset
      // of the previous request just skip it fetching
      // https://issues.folio.org/browse/STCON-118
      if (offset && offset === requestIndex && url === offsetUrl) {
        return null;
      }

      const signal = this.addAbortController('fetchPageByOffset', options);

      return fetch(url, { headers, signal })
        .then((response) => {
          if (response.status >= 400) {
            dispatch(this.fetchHTTPError(response));
          } else {
            response.json().then((json) => {
              const meta = {
                url: response.url,
                headers: response.headers,
                httpStatus: response.status,
                offset: resultOffset,
                other: records ? _.omit(json, records) : {},
              };
              if (meta.other) meta.other.totalRecords = extractTotal(json);
              const data = (records ? json[records] : json);
              if (!options.accumulate) {
                dispatch(this.actions.offsetFetchSparseSliceSuccess(meta, data));
              } else {
                dispatch(this.actions.offsetFetchSuccess(meta, data));
              }
            });
          }
        }).catch((reason) => this.handleFetchOrAbortError(reason, dispatch));
    };
  }

  // Fetches all pages until total records requested is reached
  // overwriting the previously stored result list in redux
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

        const signal = this.addAbortController(`fetchMore${offset}`, options);

        fetch(url, { headers, signal })
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

                if (meta.other) {
                  const totalRecords = extractTotal(json);

                  // if we receive totalRecords === 0 in the middle of paging,
                  // it's because we got an initial bad estimate from okapi
                  // and fell off the end of the result set.
                  //
                  // additional details at https://issues.folio.org/browse/STSMACOM-259
                  //
                  // here, we'll dispatch a success action, but with a flag
                  // that allows the reducer to handle that gracefully.
                  if (totalRecords === 0) {
                    meta.bonkersOkapiCannotCount = true;
                  } else {
                    meta.other.totalRecords = totalRecords;
                  }
                }

                const data = (records ? json[records] : json);
                dispatch(this.actions.pageSuccess(meta, data));
              });
            }
          }).catch((reason) => this.handleFetchOrAbortError(reason, dispatch));
      }
      dispatch(this.actions.pageSuccess(firstMeta, firstData));
    };
  }

  accFetch = (paramOpts, props) => {
    const key = this.stateKey();
    return (dispatch, getState) => {
      let options = this.verbOptions('GET', getState(), props);
      if (options === null) return null; // needs dynamic parts that aren't available

      options = Object.assign(options, paramOpts);

      const url = urlFromOptions(options);
      if (url === null) return null;
      const { headers, records } = options;
      dispatch(this.actions.fetchStart());

      const signal = this.addAbortController('accFetch', options);

      const beforeCatch = fetch(url, { headers, signal })
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

      beforeCatch.catch((reason) => this.handleFetchOrAbortError(reason, dispatch));

      return beforeCatch;
    };
  }

  handleFetchOrAbortError = (reason, dispatch) => {
    const { name, message } = reason;

    if (name === 'AbortError') {
      dispatch(this.actions.fetchAbort({ message }));
    } else {
      dispatch(this.actions.fetchError({ message }));
    }
  }

  fetchHTTPError = res => dispatch => res.text().then((text) => {
    dispatch(this.actions.fetchError({
      message: text || res.statusText,
      httpStatus: res.status,
    }));
  });

  mutationHTTPError = (res, mutator, meta) => dispatch => res.text().then((text) => {
    dispatch(this.actions.mutationError({
      message: text || res.statusText,
      httpStatus: res.status,
    }, mutator, meta));
  });

  getActionMeta = actionOptions => {
    return _.pick(actionOptions, 'throwErrors');
  }
}
