// import mockReq from 'mock-require';
import chai from 'chai';
import { mount, shallow, render } from 'enzyme';

import React, { Component, PropTypes } from 'react';
import { createStore, applyMiddleware, compose, combineReducers } from 'redux';
import { Provider } from 'react-redux';
import { ServerRouter, createServerRenderContext } from 'react-router';
import Match from 'react-router/Match';

// somehow this global isn't seen in okapiResource despite the same approach
// working fine in stripes-core
global.OKAPI_URL = 'http://localhost:9130';
import { connect } from '../connect';

chai.should();

const routerContext = createServerRenderContext();

// Provide a redux store and addReducer() function in context
let reducers = [];
class Root extends Component {
  addReducer = (key, reducer) => {
    if (reducers[key] === undefined) {
      reducers[key] = reducer;
      this.props.store.replaceReducer(combineReducers({ ...reducers }));
      return true;
    }
    return false;
  }

  getChildContext() {
    return { addReducer: this.addReducer.bind(this) };
  }

  render() {
    const { component:ToTest } = this.props;
    return (
      <Provider store={this.props.store}>
        <ServerRouter context={routerContext} location="/">
          <ToTest />
        </ServerRouter>
      </Provider>
    );
  }
}

Root.childContextTypes = {
  addReducer: PropTypes.func,
};

class Simple extends Component {
  render() {
    return <div id="somediv"></div>
  }
};

class Local extends Component {
  render() {
    return <div id="somediv"></div>
  }
};
Local.manifest = { localResource : {} };

describe('connect()', () => {

  it('should pass through a component with no manifest', () => {
    Simple.should.equal(connect(Simple));
  });

  it('should successfully wrap a component with a local resource', () => {
    const store = createStore((state) => state, {});
    const Connected = connect(Local, 'test');
    const inst = mount(<Root store={store} component={Connected}/>);
    inst.find(Local).props().mutator.localResource.replace({boo:'ya'});
    inst.find(Local).props().data.localResource.boo.should.equal('ya');
    inst.find(Local).props().mutator.localResource.update({boo:'urns'});
    inst.find(Local).props().data.localResource.boo.should.equal('urns');
  });
  
});
