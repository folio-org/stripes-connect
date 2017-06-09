import 'jsdom-global/register';
import chai from 'chai';
import { mount, shallow, render } from 'enzyme';

import React, { Component, PropTypes } from 'react';
import { createStore, applyMiddleware, compose, combineReducers } from 'redux';
import { Provider } from 'react-redux';
import { StaticRouter } from 'react-router';
import thunk from 'redux-thunk';
import fetchMock from 'fetch-mock';

import connect from '../connect';

chai.should();

const routerContext = {};

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
        <StaticRouter context={routerContext} location="/">
          <ToTest />
        </StaticRouter>
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
Local.manifest = { localResource : { initialValue: 'hi' } };

class Remote extends Component {
  render() {
    return <div id="somediv"></div>
  }
};
Remote.manifest = { remoteResource: {
  type: 'okapi',
  path: 'turnip',
} };

class Paged extends Component {
  render() {
    return <div id="somediv"></div>
  }
};
Paged.manifest = { pagedResource: {
  type: 'okapi',
  path: 'turnip',
  params: { q: 'dinner' },
  records: 'records',
  recordsRequired: 20,
  perRequest: 5,
} };

class Functional extends Component {
  render() {
    return <div id="somediv"></div>
  }
};
Functional.manifest = { functionalResource: {
  type: 'okapi',
  path: () => 'turnip',
  GET: {
    params: () => ({ q: 'dinner' }),
  }
} };

describe('connect()', () => {

  it('should pass through a component with no manifest', () => {
    Simple.should.equal(connect(Simple));
  });

  it('should successfully wrap a component with a local resource', () => {
    const store = createStore((state) => state, {});
    const Connected = connect(Local, 'test');
    const inst = mount(<Root store={store} component={Connected}/>);
    inst.find(Local).props().data.localResource.should.equal('hi');
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
      .put('http://localhost/turnip/1',
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

  it('should make multiple requests for a paged resource', (done) => {
    fetchMock
      .getOnce('http://localhost/turnip?limit=5&q=dinner',
        {records:[{"id":"58e5356fe84698a0a279a903","name":"Alberta"},{"id":"58e5356f364668c082d3d87a","name":"David"},{"id":"58e5356ff56928961932c1db","name":"Roxie"},{"id":"58e5356ff66b0af6f1332145","name":"Tammy"},{"id":"58e5356fd18c30d6c63503c6","name":"Sanford"}],total_records:14},
        { headers: { 'Content-Type': 'application/json', } } )
      .getOnce('http://localhost/turnip?limit=5&offset=5&q=dinner',
        {records:[{"id":"58e55786065039ceb9acb0e2","name":"Lucas"},{"id":"58e55786e2106a216fdb5629","name":"Kirkland"},{"id":"58e55786819013f1e810d28e","name":"Clarke"},{"id":"58e55786e51f01bc81b11f32","name":"Acevedo"},{"id":"58e55786791c37697eec2bc2","name":"Earnestine"}],total_records:14},

        { headers: { 'Content-Type': 'application/json', } } )
      .getOnce('http://localhost/turnip?limit=5&offset=10&q=dinner',
        {records:[{"id":"58e557e48b8b56d0bea22460","name":"Dillon"},{"id":"58e557e46120e13590013272","name":"Cain"},{"id":"58e557e41c2e37143a990445","name":"Gordon"},{"id":"28e257e41c2e37143a990445","name":"Giddeon"}],total_records:14},
        { headers: { 'Content-Type': 'application/json', } } )
      .catch(503);

    const store = createStore((state) => state,
      { okapi: { url: 'http://localhost', tenant: 'tenantid' } },
      applyMiddleware(thunk));

    const Connected = connect(Paged, 'test');
    const inst = mount(<Root store={store} component={Connected}/>);

    setTimeout(() => {
      inst.find(Paged).props().data.pagedResource.length.should.equal(14);
      fetchMock.restore();
      done();
    }, 10);
  });

  it('should run manifest functions', (done) => {
    fetchMock
      .get('http://localhost/turnip?q=dinner',
        [{"id":"58e5356fe84698a0a279a903","name":"Alberta"},{"id":"58e5356f364668c082d3d87a","name":"David"},{"id":"58e5356ff56928961932c1db","name":"Roxie"},{"id":"58e5356ff66b0af6f1332145","name":"Tammy"},{"id":"58e5356fd18c30d6c63503c6","name":"Sanford"}],
        { headers: { 'Content-Type': 'application/json', } } )
      .catch(503);

    const store = createStore((state) => state,
      { okapi: { url: 'http://localhost', tenant: 'tenantid' } },
      applyMiddleware(thunk));

    const Connected = connect(Functional, 'test');
    const inst = mount(<Root store={store} component={Connected}/>);
      inst.find(Functional).props().resources.functionalResource.hasLoaded.should.equal(false);

    setTimeout(() => {
      inst.find(Functional).props().data.functionalResource.length.should.equal(5);
      inst.find(Functional).props().resources.functionalResource.hasLoaded.should.equal(true);
      inst.find(Functional).props().resources.functionalResource.records.length.should.equal(5);
      fetchMock.restore();
      done();
    }, 10);
  });
});
