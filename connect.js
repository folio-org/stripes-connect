import React from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import { connect as reduxConnect } from 'react-redux';
import { withConnect } from './ConnectContext';

import OkapiResource from './OkapiResource';
import RESTResource from './RESTResource';
import LocalResource from './LocalResource';
import { mutationEpics, refreshEpic } from './epics';

/* eslint-env browser */
const defaultType = 'local';
const types = {
  local: LocalResource,
  okapi: OkapiResource,
  rest: RESTResource,
};

const excludedProps = ['anyTouched', 'mutator', 'connectedSource'];
let _registeredEpics = {};

// Check if props are equal by first filtering out props which are functions
// or common props introduced by stripes-connect or redux-form
function arePropsEqual(props, prevProps) {
  return _.isEqualWith(props, prevProps, _.after(2, (p1, p2, key) => {
    return (_.isFunction(p1) || _.isFunction(p2) || React.isValidElement(p1) || React.isValidElement(p2) ||
    _.includes(excludedProps, key)) ? true : undefined;
  }));
}

const wrap = (Wrapped, module, epics, logger, options = {}) => {
  const resources = [];
  const dataKey = options.dataKey;

  _.map(Wrapped.manifest, (query, name) => {
    const resource = new types[query.type || defaultType](name, query, module, logger, query.dataKey || dataKey);
    resources.push(resource);
    if (query.type === 'okapi') {
      const key = `${resource.name}${resource.module}`;
      // Only register each module component once since mutator only needs a single reference, otherwise the
      // mutations continue to be added when modules are re-connected causing performance issues.
      if (!_registeredEpics[key]) {
        _registeredEpics[key] = true;
        epics.add(...mutationEpics(resource));
      }
    }
  });

  class Wrapper extends React.Component {
    static propTypes = {
      refreshRemote: PropTypes.func.isRequired,
      // We use it, but via ...props, so:
      location: PropTypes.shape({
        hostname: PropTypes.string, // First two are not defined in some parts of lifecyle
        port: PropTypes.string,
        pathname: PropTypes.string.isRequired,
        search: PropTypes.string.isRequired,
        hash: PropTypes.string.isRequired,
        // query: null
        // state: null
      }),
      resources: PropTypes.object,
      dataKey: PropTypes.string,
      root: PropTypes.object,
    };

    constructor(props) {
      super(props);
      const context = props.root;
      this.logger = logger;
      Wrapper.logger = logger;
      logger.log('connect-lifecycle', `constructed <${Wrapped.name}>, resources =`, resources);

      if (!(context.addReducer)) {
        throw new Error('No addReducer function available in component context');
      }

      this._subscribers = [];
      resources.forEach((resource) => {
        // Hopefully paging can all be absorbed into the resource in some future
        // rearchitecting (we might also reiterate these function definitions a
        // few million less times)
        if (resource.pagingReducer) {
          const pagingKey = `${resource.stateKey()}_paging`;
          context.addReducer(pagingKey, resource.pagingReducer);
          const store = context.store;
          const onPageSuccess = (paging) => {
            const records = paging.reduce((acc, val) => acc.concat(val.records), []);
            // store.dispatch(resource.pagedFetchSuccess(records));
            store.dispatch(resource.actions.fetchSuccess(paging[paging.length - 1].meta, records));
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
          const unsubscribe = store.subscribe(pagingListener);
          this._subscribers.push(unsubscribe);
        }
        context.addReducer(resource.stateKey(), resource.reducer);
      });
    }

    componentDidMount() {
      // this.logger.log('connect', `componentDidMount about to refreshRemote for ${Wrapped.name}`);
      this.props.refreshRemote({ ...this.props });
      resources.forEach((resource) => {
        if (resource instanceof OkapiResource) {
          // Call refresh whenever mounting to ensure that mutated data is updated in the UI.
          // This is safe to call as many times as needed when re-connecting.
          epics.add(refreshEpic(resource));
          resource.markVisible();
        }
      });
    }

    componentWillReceiveProps(nextProps) { // eslint-disable-line react/no-deprecated
      // this.logger.log('connect', `in componentWillReceiveProps for ${Wrapped.name}: nextProps.location=`, nextProps.location, 'this.props.location=', this.props.location);
      if (this.componentShouldRefreshRemote(nextProps)) {
        this.props.refreshRemote({ ...nextProps });
      }
    }

    componentWillUnmount() {
      this._subscribers.forEach((unsubscribe) => unsubscribe());
      resources.forEach((resource) => {
        if (resource instanceof OkapiResource) {
          resource.markInvisible();

          if (resource.shouldReset()) {
            resource.reset();
          }
        }
      });
    }

    componentShouldRefreshRemote(nextProps) {
      // Under exactly what conditions should a change of props cause
      // a refresh? See STRIPES-393. For now, we do this when the UI URL
      // or any local resource has changed.
      if (nextProps.location !== this.props.location) return true;

      // Before checking if resources should be refreshed
      // check if the props and nextProps actually changed.
      if (arePropsEqual(this.props, nextProps)) return false;

      const { root: { store } } = this.props;
      const state = store.getState();

      for (let i = 0, size = resources.length; i < size; ++i) {
        if (resources[i].shouldRefresh(this.props, nextProps, state)) {
          return true;
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
    addReducer: PropTypes.func,
    store: PropTypes.object,
  };

  Wrapper.mapState = (state) => {
    logger.log('connect-lifecycle', `mapState for <${Wrapped.name}>, resources =`, resources);

    const resourceData = {};
    for (const r of resources) {
      resourceData[r.name] = Object.freeze(_.get(state, [`${r.stateKey()}`], null));
    }

    const newProps = { dataKey, resources: resourceData };
    // TODO Generalise this into a pass-through option on connectFor
    if (typeof state.okapi === 'object') newProps.okapi = state.okapi;
    return newProps;
  };

  Wrapper.mapDispatch = (dispatch, ownProps) => {
    const res = {};
    res.mutator = {};
    for (const r of resources) {
      res.mutator[r.name] = r.getMutator(dispatch, ownProps);
    }

    res.refreshRemote = (params) => {
      resources.forEach((resource) => {
        if (resource.refresh) {
          Wrapper.logger.log('connect', `refreshing resource '${resource.name}' for <${Wrapped.name}>`);
          resource.refresh(dispatch, params);
        }
      });
    };

    return res;
  };

  return Wrapper;
};

const defaultLogger = () => {};
defaultLogger.log = (cat, ...args) => {
  // eslint-disable-next-line no-console
  console.log(`stripes-connect (${cat})`, ...args);
};

export const connect = (Component, module, epics, loggerArg, options) => {
  const logger = loggerArg || defaultLogger;
  if (typeof Component.manifest === 'undefined') {
    logger.log('connect-no', `not connecting <${Component.name}> for '${module}': no manifest`);
    return Component;
  }
  logger.log('connect', `connecting <${Component.name}> for '${module}'`);
  const Wrapper = wrap(Component, module, epics, logger, options);
  const Connected = reduxConnect(Wrapper.mapState, Wrapper.mapDispatch, Wrapper.mergeProps)(withConnect(Wrapper));
  return Connected;
};

export const connectFor = (module, epics, logger) => (Component, options) => connect(Component, module, epics, logger, options);

export { default as ConnectContext, withConnect } from './ConnectContext';

export function reset() {
  _registeredEpics = {};
}
export default connect;
