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

const wrap = (Wrapped, module) => {
  function setErrorHandler(handler, force) {
    if (force || !module2errorHandler[module]) {
      module2errorHandler[module] = handler;
    }
  }

  const resources = [];
  _.forOwn(Wrapped.manifest, (query, name) => {
    if (!name.startsWith('@')) {
      // Regular manifest entries describe resources
      const resource = new types[query.type || defaultType](name, query, module);
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
        errorHandler(Object.assign({}, action.data, { op, error: action.error }));
      }
    }

    // No change to state
    return state;
  }

  function naiveErrorHandler(e) {
    alert(`ERROR: in module ${e.module} operation ${e.op} on resource `
          + `${e.resource} failed, saying: ${e.error}`);
  }

  class Wrapper extends React.Component {
    static propTypes = {
      refreshRemote: React.PropTypes.func.isRequired,
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
      if (!(context.addReducer)) {
        throw new Error('No addReducer function available in component context');
      }
      resources.forEach((resource) => {
        context.addReducer(resource.stateKey(), resource.reducer);
      });
      context.addReducer(`@@error-${module}`, errorReducer);
      setErrorHandler(naiveErrorHandler, false);
    }

    componentDidMount() {
      this.props.refreshRemote({ ...this.props });
    }

    componentWillReceiveProps(nextProps) {
      if (nextProps.location !== this.props.location) {
        this.props.refreshRemote({ ...nextProps });
      }
    }

    render() {
      return (
        <Wrapped {...this.props} />
      );
    }

  }

  Wrapper.contextTypes = {
    addReducer: React.PropTypes.func,
  };

  Wrapper.mapState = state => ({
    data: Object.freeze(resources.reduce((result, resource) => {
      const tmp = {};
      tmp[resource.name] = Object.freeze(_.get(state, [resource.stateKey()], null));
      return Object.assign({}, result, tmp);
    }, {})),
  });

  Wrapper.mapDispatch = dispatch => ({
    mutator: resources.reduce((result, resource) => {
      const tmp = {};
      tmp[resource.name] = resource.getMutator(dispatch);
      return Object.assign({}, result, tmp);
    }, {}),
    refreshRemote: (params) => {
      resources.forEach((resource) => {
        if (resource.refresh) {
          resource.refresh(dispatch, params);
        }
      });
    },
  });

  return Wrapper;
};

export const connect = (Component, module) => {
  if (typeof Component.manifest === 'undefined') return Component;
  const Wrapper = wrap(Component, module);
  const Connected = reduxConnect(Wrapper.mapState, Wrapper.mapDispatch)(Wrapper);
  return Connected;
};

export const connectFor = module => Component => connect(Component, module);

export default connect;
