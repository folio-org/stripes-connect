import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import { connect as reduxConnect } from 'react-redux';
import { withConnect } from './ConnectContext';

import OkapiResource from './OkapiResource';
import RESTResource from './RESTResource';
import { initialResourceState } from './RESTResource/reducer';
import LocalResource from './LocalResource';
import { mutationEpics, refreshEpic } from './epics';
import usePrevious from './hooks/usePrevious';

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

  const componentShouldRefreshRemote = (props, nextProps) => {
    // Under exactly what conditions should a change of props cause
    // a refresh? See STRIPES-393. For now, we do this when the UI URL
    // or any local resource has changed.
    if (nextProps.location !== props.location) return true;

    // Before checking if resources should be refreshed
    // check if the props and nextProps actually changed.
    if (arePropsEqual(props, nextProps)) return false;

    const { root: { store } } = props;
    const state = store.getState();

    for (let i = 0, size = resources.length; i < size; ++i) {
      if (resources[i].shouldRefresh(props, nextProps, state)) {
        return true;
      }
    }

    return false;
  };

  const initResources = (context, subscribers) => {
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
        subscribers.current.push(unsubscribe);
      }
      context.addReducer(resource.stateKey(), resource.reducer);
    });
  };

  const unmount = (subscribers) => {
    subscribers.forEach(unsubscribe => unsubscribe());
    resources.forEach((resource) => {
      if (resource instanceof OkapiResource) {
        resource.markInvisible();

        if (resource.shouldReset()) {
          resource.reset();
        }

        if (!resource.isVisible()) {
          resource.cancelRequestsOnUnmout();
        }
      }
    });
  };

  const Wrapper = (props) => {
    const {
      root: context,
      refreshRemote,
    } = props;
    const _subscribers = useRef([]);
    const prevProps = usePrevious(props);

    // runs initially when component mounts for the first time
    useEffect(() => {
      initResources(context, _subscribers);
      refreshRemote({ ...props });

      resources.forEach((resource) => {
        if (resource instanceof OkapiResource) {
          // Call refresh whenever mounting to ensure that mutated data is updated in the UI.
          // This is safe to call as many times as needed when re-connecting.
          epics.add(refreshEpic(resource));
          resource.markVisible();
        }
      });

      const subscribers = _subscribers.current;

      return () => unmount(subscribers);
      // This hook should only execute once
      // when the Wrapper mounts for the first time
      // so turn off eslint complaining about missing dependencies.
    }, []); // eslint-disable-line react-hooks/exhaustive-deps


    // run when component's props have changed
    useEffect(() => {
      if (prevProps && componentShouldRefreshRemote(prevProps, props)) {
        refreshRemote({ ...props });
      }
    }, [props, prevProps, refreshRemote]);

    return <Wrapped {...props} />;
  };

  Wrapper.logger = logger;
  Wrapper.propTypes = {
    refreshRemote: PropTypes.func.isRequired,
    // We use it, but via ...props, so:
    location: PropTypes.shape({
      hostname: PropTypes.string, // First two are not defined in some parts of lifecyle
      port: PropTypes.string,
      pathname: PropTypes.string.isRequired,
      search: PropTypes.string.isRequired,
      hash: PropTypes.string.isRequired,
    }),
    resources: PropTypes.object,
    dataKey: PropTypes.string,
    root: PropTypes.object,
  };

  Wrapper.mapState = (state) => {
    logger.log('connect-lifecycle', `mapState for <${Wrapped.name}>, resources =`, resources);

    const resourceData = {};

    for (const r of resources) {
      let initState = _.get(state, r.stateKey());

      if (!initState) {
        if (r instanceof OkapiResource) {
          initState = initialResourceState;
        } else {
          initState = r?.query?.initialValue !== undefined ? r.query.initialValue : {};
        }
      }

      resourceData[r.name] = Object.freeze(initState);
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

const defaultLogger = () => { };
defaultLogger.log = (cat, ...args) => {
  // eslint-disable-next-line no-console
  console.log(`stripes-connect (${cat})`, ...args);
};

export const connect = (Component, module, epics, loggerArg, options) => {
  const logger = loggerArg || defaultLogger;
  if (typeof Component === 'undefined') {
    throw Error(`connect() called on an undefined component from ${module}.
This generally tends to be the case when you imported a component from the wrong place, so triple-check your paths and whether something is a named or default export!
Also, the component file may have failed to parse correctly. Check the browser console logs to see if this may be the case.`);
  }

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
