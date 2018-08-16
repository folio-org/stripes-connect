import 'jsdom-global/register';
import chai from 'chai';
import Enzyme, { mount, shallow, render } from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { createStore, applyMiddleware, compose, combineReducers } from 'redux';
import { Provider } from 'react-redux';
import thunk from 'redux-thunk';
import fetchMock from 'fetch-mock';
import { RootContext } from "@folio/stripes-core/src/components/Root/RootContext";

import connect from '../connect';


Enzyme.configure({ adapter: new Adapter() });

chai.should();

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
        <RootContext.Provider value={{ addReducer: this.addReducer, addEpic: this.addEpic, store: this.props.store }}>
          <ToTest {...this.props} />
        </RootContext.Provider>
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

class CompWithPerms extends Component {
  render() {
    return <div id="somediv"></div>
  }
};
CompWithPerms.manifest = { resourceWithPerms: {
  type: 'okapi',
  path: () => 'turnip',
  GET: {
    params: () => ({ q: 'dinner' }),
  },
  permissionsRequired: 'perm1,perm2',
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

class ErrorProne extends Component {
  render() {
    return <div id="somediv"></div>
  }
};
ErrorProne.manifest = { errorProne: {
  type: 'okapi',
  path: () => 'turnep',
} };

class Acc extends Component {
  render() {
    return <div id="somediv"></div>
  }
};
Acc.manifest = { accResource: {
  type: 'okapi',
  accumulate: true,
  path: 'turnip',
} };

class Child2 extends Component {
  static manifest = { childResource2 : { initialValue: 'child2' } };

  render() {
    return <div id="somediv"></div>
  }
};

class Child1 extends Component {
  static manifest = { childResource1 : { initialValue: 'child1' } };

  constructor() {
    super();
    this.childConnect = connect(Child2, 'child2', mockedEpics, defaultLogger);
  }
  render() {
    return <this.childConnect />
  }
};

class Parent extends Component {
  static manifest =  { parentResource : { initialValue: 'parent' } };

  constructor() {
    super();
    this.childConnect = connect(Child1, 'child1', mockedEpics, defaultLogger);
  }

  render() {
    return this.props.showChild ? (<this.childConnect />) : (<div></div>);
  }
};

const defaultLogger = () => {};
defaultLogger.log = (cat, ...args) => {};

const mockedEpics = {
  add: () => {}
};

describe('connect()', () => {

  it('should pass through a component with no manifest', () => {
    Simple.should.equal(connect(Simple, 'NoModule', mockedEpics, defaultLogger));
  });

  it('should successfully wrap a component with a local resource', () => {
    const store = createStore((state) => state, {});
    const Connected = connect(Local, 'test', mockedEpics, defaultLogger);
    const inst = mount(<Root store={store} component={Connected}/>);
    inst.find(Local).props().resources.localResource.should.equal('hi');
    inst.find(Local).props().mutator.localResource.replace({boo:'ya'});
    inst.find(Local).instance().props.resources.localResource.boo.should.equal('ya');
    inst.find(Local).props().mutator.localResource.update({boo:'urns'});
    inst.find(Local).instance().props.resources.localResource.boo.should.equal('urns');
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

    const Connected = connect(Remote, 'test', mockedEpics, defaultLogger);
    const inst = mount(<Root store={store} component={Connected}/>);

    inst.find(Remote).props().mutator.remoteResource.PUT({id:1, someprop:'new'})
      .then(res => res.someprop.should.equal('new'));
    fetchMock.lastCall()[1].body.should.equal('{"id":1,"someprop":"new"}');
    fetchMock.lastCall()[1].headers['X-Okapi-Tenant'].should.equal('tenantid');

    inst.find(Remote).props().mutator.remoteResource.DELETE({id:1});
    fetchMock.lastCall()[0].should.equal('http://localhost/turnip/1');

    inst.find(Remote).props().mutator.remoteResource.POST({someprop:'newer'})
      .then(res => res.someprop.should.equal('newer'));
    // Confirm UUID is generated
    fetchMock.lastCall()[1].body.length.should.equal(64);

    setTimeout(() => {
      inst.find(Remote).instance().props.resources.remoteResource.records[0].someprop.should.equal('someval');
      inst.find(Remote).instance().props.resources.remoteResource.successfulMutations[0].record.someprop.should.equal('newer');
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

    const Connected = connect(Paged, 'test', mockedEpics, defaultLogger);
    const inst = mount(<Root store={store} component={Connected}/>);

    setTimeout(() => {
      inst.find(Paged).instance().props.resources.pagedResource.records.length.should.equal(14);
      fetchMock.restore();
      done();
    }, 40);
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

    const Connected = connect(Functional, 'test', mockedEpics, defaultLogger);
    const inst = mount(<Root store={store} component={Connected}/>);
    inst.find(Functional).props().resources.functionalResource.hasLoaded.should.equal(false);

    setTimeout(() => {
      inst.find(Functional).instance().props.resources.functionalResource.hasLoaded.should.equal(true);
      inst.find(Functional).instance().props.resources.functionalResource.records.length.should.equal(5);
      fetchMock.restore();
      done();
    }, 10);
  });

  it('should fail appropriately', (done) => {
    fetchMock
      .get('http://localhost/turnep',
        { status: 404 })
      .post('http://localhost/turnep',
        { status: 403, body: 'You are forbidden because reasons.' })
      .catch(503);

    const store = createStore((state) => state,
      { okapi: { url: 'http://localhost', tenant: 'tenantid' } },
      applyMiddleware(thunk));

    const Connected = connect(ErrorProne, 'test', mockedEpics, defaultLogger);
    const inst = mount(<Root store={store} component={Connected}/>);
    inst.find(ErrorProne).props().mutator.errorProne.POST({id:1, someprop:'new'})
      .catch(err => err.text().then(msg => msg.should.equal('You are forbidden because reasons.')));
   setTimeout(() => {
      const res = inst.find(ErrorProne).instance().props.resources.errorProne;
      res.isPending.should.equal(false);
      res.failed.httpStatus.should.equal(404);
      res.failedMutations[0].message.should.equal('You are forbidden because reasons.');
      fetchMock.restore();
      done();
    }, 10);
  });

  it('should fail because of missing permissions', (done) => {
    fetchMock
      .get('http://localhost/turnip?q=dinner',
        [{"id":"58e5356fe84698a0a279a903","name":"Alberta"}],
        { headers: { 'Content-Type': 'application/json', } } )

    const store = createStore((state) => state,
      { okapi: { url: 'http://localhost', tenant: 'tenantid', currentPerms: { perm1: true } } },
      applyMiddleware(thunk));

    const Connected = connect(CompWithPerms, 'test2', mockedEpics, defaultLogger);
    const inst = mount(<Root store={store} component={Connected}/>);

    setTimeout(() => {
      const res = inst.find(CompWithPerms).instance().props.resources.resourceWithPerms;
      res.isPending.should.equal(false);
      res.hasLoaded.should.equal(false);
      fetchMock.restore();
      done();
    }, 10);
  });

  it('should make a request because required permissions are present', (done) => {
    fetchMock
      .get('http://localhost/turnip?q=dinner',
        [{"id":"58e5356fe84698a0a279a903","name":"Alberta"}],
        { headers: { 'Content-Type': 'application/json', } } )

    const store = createStore((state) => state,
      { okapi: { url: 'http://localhost', tenant: 'tenantid', currentPerms: { perm1: true, perm2: true, perm3: true } } },
      applyMiddleware(thunk));

    const Connected = connect(CompWithPerms, 'test1', mockedEpics, defaultLogger);
    const inst = mount(<Root store={store} component={Connected}/>);

    setTimeout(() => {
      const res = inst.find(CompWithPerms).instance().props.resources.resourceWithPerms;
      res.isPending.should.equal(false);
      res.hasLoaded.should.equal(true);
      res.records.length.should.equal(1);
      fetchMock.restore();
      done();
    }, 10);
  });

  it('should accumulate records', (done) => {
    fetchMock
      .get('http://localhost/turnip',
         [{ id: 1, someprop: 'someval' }],
         { headers: { 'Content-Type': 'application/json', } } )
      .get('http://localhost/parsnip',
         [{ id: 2, someprop: 'otherval' }],
         { headers: { 'Content-Type': 'application/json', } } )
      .get('http://localhost/potato',
        { status: 403, body: 'No potato.' })
      .catch(503);

    const store = createStore((state) => state,
      { okapi: { url: 'http://localhost', tenant: 'tenantid' } },
      applyMiddleware(thunk));

    const Connected = connect(Acc, 'test', mockedEpics, defaultLogger);
    const inst = mount(<Root store={store} component={Connected}/>);

    inst.find(Acc).props().mutator.accResource.GET({})
    inst.find(Acc).props().mutator.accResource.GET({path: 'parsnip'})
      .then(rec => rec[0].someprop.should.equal('otherval'));
    inst.find(Acc).props().mutator.accResource.GET({path: 'potato'})
      .catch(err => err.httpStatus.should.equal(403));

    setTimeout(() => {
      const res = inst.find(Acc).instance().props.resources.accResource;
      res.records[0].someprop.should.equal('someval');
      res.records[1].someprop.should.equal('otherval');
      inst.find(Acc).props().mutator.accResource.reset();
      inst.find(Acc).props().resources.accResource.records.length.should.equal(0);
      fetchMock.restore();
      done();
    }, 10);
  });

  it('should reconnect previously connected component', () => {
    const store = createStore((state) => state, {});
    const Connected = connect(Parent, 'test', mockedEpics, defaultLogger);
    const inst = mount(<Root showChild={true} store={store} component={Connected}/>);

    inst.find(Child2).props().resources.should.have.property('childResource2');
    inst.find(Child2).props().mutator.should.have.property('childResource2');
    inst.find(Child2).props().resources.childResource2.should.equal('child2');

    inst.setProps({ showChild: false });
    inst.setProps({ showChild: true });

    inst.find(Child2).props().resources.should.have.property('childResource2');
    inst.find(Child2).props().mutator.should.have.property('childResource2');
  });

});
