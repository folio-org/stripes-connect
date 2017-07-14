import React from 'react';
import _ from 'lodash';
import { connect as reduxConnect } from 'react-redux';
import ResourceManager from './ResourceManager';

/* eslint-env browser */
const defaultType = 'local';

const wrap = (Wrapped, module, logger) => {
  const resourceManager = new ResourceManager(module, logger);

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
      resourceManager.create(Wrapped.manifest, props);
      logger.log('connect-lifecycle', `constructed <${Wrapped.name}>, resources =`, resourceManager.getResources());
    }

    componentWillMount() {
      resourceManager.init(this.context);
    }

    componentDidMount() {
      // this.logger.log('connect', `componentDidMount about to refreshRemote for ${Wrapped.name}`);
      this.props.refreshRemote({ ...this.props });
      resourceManager.markVisible();
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

    componentWillUnmount() {
      resourceManager.markInvisible();
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
    const resources = resourceManager.getResources();

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
    const resources = resourceManager.getResources();
    logger.log('connect-lifecycle', `mapDispatch for <${Wrapped.name}>, resources =`, resources);
    return { dispatch };
  };

  Wrapper.mergeProps = (stateProps, dispatchProps, ownProps) => {
    const dispatch = dispatchProps.dispatch;
    const resources = resourceManager.getResources();

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
