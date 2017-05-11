// We have to remove node_modules/react to avoid having multiple copies loaded.
// eslint-disable-next-line import/no-unresolved
import React from 'react';
import _ from 'lodash';
import { connect as reduxConnect } from 'react-redux';
import OkapiResource from './OkapiResource';
import RESTResource from './RESTResource';
import LocalResource from './LocalResource';
/* eslint-env browser */

const defaultType = 'local';
const types = {
  local: LocalResource,
  okapi: OkapiResource,
  rest: RESTResource,
};

// Should be doable with a scalar in a closure, but doesn't work right for some reason.
const module2errorHandler = {};

const wrap = (Wrapped, module, logger) => {
  function setErrorHandler(handler, force) {
    if (force || !module2errorHandler[module]) {
      module2errorHandler[module] = handler;
    }
  }

  const resources = [];
  _.forOwn(Wrapped.manifest, (query, name) => {
    if (!name.startsWith('@')) {
      // Regular manifest entries describe resources
      const resource = new types[query.type || defaultType](name, query, module, logger);
      resources.push(resource);
    } else if (name === '@errorHandler') {
      setErrorHandler(query);
    } else {
      console.log(`WARNING: ${module} ignoring unsupported special manifest entry '${name}'`);
    }
  });

  function errorReducer(state = [], action) {
    // Handle error actions. I'm not sure how I feel about dispatching
    // from a reducer, but it's the only point of universal contact
    // with all errors.
    const a = action.type.split('_');
    const typetype = a.pop();
    if (typetype === 'ERROR') {
      if (action.data.module === module) {
        const op = a.pop();
        const errorHandler = module2errorHandler[module];
        console.log(`using error-handler for ${module}`);
        let status, error;
        if (typeof action.error === 'object') {
          status = action.error.status;
          error = action.error.message;
        } else {
          status = null;
          error = action.error;
        }
        errorHandler(Object.assign({}, action.data, { op, status, error }));
      }
    }

    // No change to state
    return state;
  }

  function naiveErrorHandler(e) {
    // eslint-disable-next-line prefer-template
    alert(`ERROR: in module ${e.module}, operation ${e.op} on resource `
          + `'${e.resource}' failed`
          + (e.status ? ` with HTTP status ${e.status}` : '')
          + (e.error ? `, saying: ${e.error}` : ''));
  }

  class Wrapper extends React.Component {
    static propTypes = {
      refreshRemote: React.PropTypes.func.isRequired,
      // We use it, but via ...props, so:
      // eslint-disable-next-line react/no-unused-prop-types
      location: React.PropTypes.shape({
        hostname: React.PropTypes.string, // First two are not defined in some parts of lifecyle
        port:     React.PropTypes.string,
        pathname: React.PropTypes.string.isRequired,
        search:   React.PropTypes.string.isRequired,
        hash:     React.PropTypes.string.isRequired,
        // query: null
        // state: null
      }),
    };

    constructor(props, context) {
      super();
      this.context = context;
      this.logger = logger;
      Wrapper.logger = logger;
    }

    componentWillMount() {
      // this.logger.log('connect', `in componentWillMount for ${Wrapped.name}`);
      if (!(this.context.addReducer)) {
        throw new Error('No addReducer function available in component context');
      }
      resources.forEach((resource) => {
        // Hopefully paging can all be absorbed into the resource in some future
        // rearchitecting (we might also reiterate these function definitions a
        // few million less times)
        if (resource.pagingReducer) {
          const pagingKey = `${resource.stateKey()}_paging`;
          this.context.addReducer(pagingKey, resource.pagingReducer);
          const store = this.context.store;
          const onPageSuccess = (paging) => {
            const records = paging.reduce((acc, val) => acc.concat(val.records), []);
            store.dispatch(resource.pagedFetchSuccess(records));
          };
          const onPageChange = (paging) => {
            const allDone = paging.reduce((acc, val) => acc && val.isComplete, true);
            if (allDone && paging.length > 0) onPageSuccess(paging);
          };
          let currentPaging;
          const pagingListener = () => {
            const previousPaging = currentPaging;
            currentPaging = store.getState()[pagingKey];
            if (currentPaging !== previousPaging) onPageChange(currentPaging);
          };
          store.subscribe(pagingListener);
        }
        this.context.addReducer(resource.stateKey(), resource.reducer);

        // TODO this may move, but while it's here, it's going to be called
        // more than necessary
        if (typeof resource.init === 'function') {
          resource.init(this.context.store);
        }
      });

      this.context.addReducer(`@@error-${module}`, errorReducer);
      setErrorHandler(naiveErrorHandler, false);
    }

    componentDidMount() {
      // this.logger.log('connect', `componentDidMount about to refreshRemote for ${Wrapped.name}`);
      this.props.refreshRemote({ ...this.props });
    }

    componentWillReceiveProps(nextProps) {
      // this.logger.log('connect', `in componentWillReceiveProps for ${Wrapped.name}: nextProps.location=`, nextProps.location, 'this.props.location=', this.props.location);
      this.props.refreshRemote({ ...nextProps });
    }

    render() {
      return (
        <Wrapped {...this.props} />
      );
    }

  }

  Wrapper.contextTypes = {
    addReducer: React.PropTypes.func,
    store: React.PropTypes.object,
  };

  Wrapper.mapState = state => ({
    data: Object.freeze(resources.reduce((result, resource) => {
      const tmp = {};
      tmp[resource.name] = Object.freeze(_.get(state, [resource.stateKey()], null));
      return Object.assign({}, result, tmp);
    }, {})),
  });

  Wrapper.mapDispatch = (dispatch, ownProps) => ({
    mutator: resources.reduce((result, resource) => {
      const tmp = {};
      tmp[resource.name] = resource.getMutator(dispatch, ownProps);
      return Object.assign({}, result, tmp);
    }, {}),
    refreshRemote: (params) => {
      resources.forEach((resource) => {
        if (resource.refresh) {
          Wrapper.logger.log('connect', `refreshing resource '${resource.name}' for <${Wrapped.name}>`);
          resource.refresh(dispatch, params);
        }
      });
    },
  });

  return Wrapper;
};

const defaultLogger = () => {};
defaultLogger.log = (cat, ...args) => {
  console.log(`stripes-connect (${cat})`, ...args);
};

export const connect = (Component, module, loggerArg) => {
  const logger = loggerArg || defaultLogger;
  if (typeof Component.manifest === 'undefined') {
    logger.log('connect-no', `not connecting <${Component.name}> for '${module}': no manifest`);
    return Component;
  }
  logger.log('connect', `connecting <${Component.name}> for '${module}'`);
  const Wrapper = wrap(Component, module, logger);
  const Connected = reduxConnect(Wrapper.mapState, Wrapper.mapDispatch)(Wrapper);
  return Connected;
};

export const connectFor = (module, logger) => Component => connect(Component, module, logger);

export default connect;
