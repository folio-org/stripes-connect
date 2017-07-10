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
  const resourceRegister = {}; // map of resource names to resource objects

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
      data: React.PropTypes.object, // eslint-disable-line react/forbid-prop-types
      dataKey: React.PropTypes.string,
    };

    constructor(props, context) {
      super();
      this.context = context;
      this.logger = logger;
      Wrapper.logger = logger;

      // this.resources = []; // references to a subset of class-level resources
      _.forOwn(Wrapped.manifest, (query, name) => {
        if (!name.startsWith('@')) {
          // Regular manifest entries describe resources
          const dk = props.dataKey;
          const dkName = `${name}${dk === undefined ? '' : `-${dk}`}`;
          if (!resourceRegister[dkName]) {
            const resource = new types[query.type || defaultType](name, query, module, logger, props.dataKey);
            resources.push(resource);
            resourceRegister[dkName] = resource;
            // this.resources.push(resource);
          }
        } else if (name === '@errorHandler') {
          // XXX It doesn't really make sense to do this for each instance in the class
          setErrorHandler(query);
        } else {
          console.log(`WARNING: ${module} ignoring unsupported special manifest entry '${name}'`);
        }
      });
      logger.log('connect-lifecycle', `constructed <${Wrapped.name}>, resources =`, resources);
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
            store.dispatch(resource.fetchSuccess111(paging[paging.length - 1].meta, records));
          };
          const onPageChange = (paging) => {
            const allDone = paging.reduce((acc, val) => acc && val.isComplete, true);
            if (allDone && paging.length > 0) onPageSuccess(paging);
          };
          let currentPaging;
          const pagingListener = () => {
            const previousPaging = currentPaging;
            currentPaging = store.getState()[pagingKey];
            if (currentPaging && currentPaging !== previousPaging) onPageChange(currentPaging);
          };
          store.subscribe(pagingListener);
        }
        this.context.addReducer(`${resource.stateKey()}111`, resource.reducer111);
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
      if (this.componentShouldRefreshRemote(nextProps)) {
        this.props.refreshRemote({ ...nextProps });
      }
    }

    componentShouldRefreshRemote(nextProps) {
      // Under exactly what conditions should a change of props cause
      // a refresh? See STRIPES-393. For now, we do this is the UI URL
      // or any local resource has changed.
      if (nextProps.location !== this.props.location) return true;
      const data = this.props.data;
      for (const key of Object.keys(data)) {
        const m = Wrapped.manifest[key];
        const type = m.type || defaultType;
        if (type === 'local') {
          const same = _.isEqual(data[key], nextProps.data[key]);
          // console.log(`local resource '${key}': OLD =`, data[key], 'NEW =', nextProps.data[key], `-- same=${same}`);
          if (!same) return true;
        }
      }
      return false;
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

  Wrapper.mapState = (state, ownProps) => {
    const data = {};
    logger.log('connect-lifecycle', `mapState for <${Wrapped.name}>, resources =`, resources);
    for (const r of resources) {
      if (r.dataKey === ownProps.dataKey) {
        data[r.name] = Object.freeze(_.get(state, [r.stateKey()], null));
      }
    }

    const resourceData = {};
    for (const r of resources) {
      resourceData[r.name] = Object.freeze(_.get(state, [`${r.stateKey()}111`], null));
    }

    const newProps = { data, resources: resourceData };
    // TODO Generalise this into a pass-through option on connectFor
    if (typeof state.okapi === 'object') newProps.okapi = state.okapi;

    return newProps;
  };

  // This seems to get called only _before_ the constructor, so does
  // not see the resources that have been added at construction. So
  // all we do is stash the dispatch function, and leave the
  // mergeProps function (which gets called after each mapState) to
  // use it to do the real dispatch-mapping.
  //
  Wrapper.mapDispatch = (dispatch) => {
    logger.log('connect-lifecycle', `mapDispatch for <${Wrapped.name}>, resources =`, resources);
    return { dispatch };
  };

  Wrapper.mergeProps = (stateProps, dispatchProps, ownProps) => {
    const dispatch = dispatchProps.dispatch;
    logger.log('connect-lifecycle', `mergeProps for <${Wrapped.name}>, resources =`, resources);
    const res = {};

    res.mutator = {};
    for (const r of resources) {
      if (r.dataKey === ownProps.dataKey) {
        res.mutator[r.name] = r.getMutator(dispatch, ownProps);
      }
    }

    res.refreshRemote = (params) => {
      resources.forEach((resource) => {
        if (resource.refresh) {
          Wrapper.logger.log('connect', `refreshing resource '${resource.name}' for <${Wrapped.name}>`);
          resource.refresh(dispatch, params);
        }
      });
    };

    return Object.assign({}, ownProps, stateProps, res);
  };

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
  const Connected = reduxConnect(Wrapper.mapState, Wrapper.mapDispatch, Wrapper.mergeProps)(Wrapper);
  return Connected;
};

export const connectFor = (module, logger) => Component => connect(Component, module, logger);

export default connect;
