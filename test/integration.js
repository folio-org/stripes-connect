import 'jsdom-global/register';
import chai from 'chai';
import { mount, shallow, render } from 'enzyme';

import React, { Component, PropTypes } from 'react';
import { createStore, applyMiddleware, compose, combineReducers } from 'redux';
import { Provider } from 'react-redux';
import { ServerRouter, createServerRenderContext } from 'react-router';
import Match from 'react-router/Match';
import thunk from 'redux-thunk';
import fetchMock from 'fetch-mock';

import connect from '../connect';

chai.should();

const routerContext = createServerRenderContext();

// Provide a redux store and addReducer() function in context
let reducers = { okapi: (state = {}) => state };
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

class Remote extends Component {
  render() {
    return <div id="somediv"></div>
  }
};
Remote.manifest = { remoteResource: {
  type: 'okapi',
  path: 'turnip',
} };

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
  
  it('should successfully wrap a component with an okapi resource', (done) => {
    fetchMock
      .get('http://localhost/turnip',
         [{ id: 1, someprop: 'someval' }],
         { headers: { 'Content-Type': 'application/json', } } )
      .put('http://localhost/turnip',
         { id: 1, someprop: 'someval' },
         { headers: { 'Content-Type': 'application/json', } } )
      .post('http://localhost/turnip',
         { id: 1, someprop: 'someval' },
         { headers: { 'Content-Type': 'application/json', } } )
      .delete('http://localhost/turnip/1',
         { id: 1, someprop: 'someval' },
         { headers: { 'Content-Type': 'application/json', } } )
      .catch(503);

    const store = createStore((state) => state,
      { okapi: { url: 'http://localhost', tenant: 'tenantid' } },
      applyMiddleware(thunk));

    const Connected = connect(Remote, 'test');
    const inst = mount(<Root store={store} component={Connected}/>);

    inst.find(Remote).props().mutator.remoteResource.PUT({id:1, someval:'new'});
    fetchMock.lastCall()[1].body.should.equal('{"id":1,"someval":"new"}');
    fetchMock.lastCall()[1].headers['X-Okapi-Tenant'].should.equal('tenantid');

    inst.find(Remote).props().mutator.remoteResource.DELETE({id:1});
    fetchMock.lastCall()[0].should.equal('http://localhost/turnip/1');

    inst.find(Remote).props().mutator.remoteResource.POST({someval:'new'});
    // Confirm UUID is generated
    fetchMock.lastCall()[1].body.length.should.equal(61);

    setTimeout(() => {
      inst.find(Remote).props().data.remoteResource[0].someprop.should.equal('someval');
      fetchMock.restore();
      done();
    }, 10);
  });
});
