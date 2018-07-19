import 'jsdom-global/register';
import chai from 'chai';
import Enzyme, { mount } from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';

import React, { Component } from 'react';
import { createStore, applyMiddleware, combineReducers } from 'redux';
import { Provider } from 'react-redux';
import thunk from 'redux-thunk';
import fetchMock from 'fetch-mock';

import { connectFor } from '../connect';

Enzyme.configure({ adapter: new Adapter() });

chai.should();

const defaultLogger = () => {};
defaultLogger.log = (cat, ...args) => {};

const mockedEpics = {
  add: () => {}
};

// Provide a redux store and addReducer() function
let reducers = { okapi: (state = {}) => state };
class Root extends Component {
  constructor(props) {
    super(props);
    this.connect = connectFor('@folio/core', mockedEpics, defaultLogger, this.addReducer, props.store);
  }
  addReducer = (key, reducer) => {
    if (reducers[key] === undefined) {
      reducers[key] = reducer;
      this.props.store.replaceReducer(combineReducers({ ...reducers }));
      return true;
    }
    return false;
  }

  render() {
    const { component:ToTest, store } = this.props;
    return (
      <Provider store={store}>
        <ToTest {...this.props} connect={this.connect} />
      </Provider>
    );
  }
}

describe('Test: connect()', () => {

  it('should pass through a component with no manifest', () => {
    const Simple = () => (<div id="somediv"></div>);
    const SimpleWrapper = ({ connect }) => {
      const ConnectedSimple = connect(Simple);
      return <ConnectedSimple/>
    };
    const inst = mount(
      <Root component={SimpleWrapper} store={createStore((state) => state, {})} />
    );
    inst.containsMatchingElement(<Simple/>).should.equal(true);
  });

  it('should successfully wrap a component with a local resource', () => {
    class Local extends Component {
      static manifest = { localResource : { initialValue: 'hi' } };
      render() {
        return (<div id="somediv"></div>);
      }
    }
    const LocalWrapper = ({ connect }) => {
      const ConnectedLocal = connect(Local);
      return <ConnectedLocal/>
    };
    const inst = mount(
      <Root component={LocalWrapper} store={createStore((state) => state, {})} />
    );
    inst.find(Local).props().resources.localResource.should.equal('hi');
    inst.find(Local).props().mutator.localResource.replace({boo:'ya'});
    inst.find(Local).instance().props.resources.localResource.boo.should.equal('ya');
    inst.find(Local).props().mutator.localResource.update({boo:'urns'});
    inst.find(Local).instance().props.resources.localResource.boo.should.equal('urns');
  });

  it('should successfully wrap a component with an okapi resource', (done) => {
    class Remote extends Component {
      static manifest = { remoteResource: {
        type: 'okapi',
        path: 'turnip',
      } };
      render() {
        return <div id="somediv"></div>
      }
    };
    const RemoteWrapper = ({ connect }) => {
      const ConnectedRemote = connect(Remote);
      return <ConnectedRemote/>
    };
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

    const inst = mount(
      <Root component={RemoteWrapper} store={store} />
    );

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
    class Paged extends Component {
      static manifest = { pagedResource: {
        type: 'okapi',
        path: 'turnip',
        params: { q: 'dinner' },
        records: 'records',
        recordsRequired: 20,
        perRequest: 5,
      } };
      render() {
        return <div id="somediv"></div>
      }
    };
    const PagedWrapper = ({ connect }) => {
      const ConnectedPaged = connect(Paged);
      return <ConnectedPaged/>
    };
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

    const inst = mount(
      <Root component={PagedWrapper} store={store} />
    );

    setTimeout(() => {
      inst.find(Paged).instance().props.resources.pagedResource.records.length.should.equal(14);
      fetchMock.restore();
      done();
    }, 40);
  });

  it('should run manifest functions', (done) => {
    class Functional extends Component {
      static manifest = { functionalResource: {
        type: 'okapi',
        path: () => 'turnip',
        GET: {
          params: () => ({ q: 'dinner' }),
        }
      } };
      render() {
        return <div id="somediv"></div>
      }
    };
    const FunctionalWrapper = ({ connect }) => {
      const ConnectedFunctional = connect(Functional);
      return <ConnectedFunctional/>
    };
    fetchMock
      .get('http://localhost/turnip?q=dinner',
        [{"id":"58e5356fe84698a0a279a903","name":"Alberta"},{"id":"58e5356f364668c082d3d87a","name":"David"},{"id":"58e5356ff56928961932c1db","name":"Roxie"},{"id":"58e5356ff66b0af6f1332145","name":"Tammy"},{"id":"58e5356fd18c30d6c63503c6","name":"Sanford"}],
        { headers: { 'Content-Type': 'application/json', } } )
      .catch(503);

    const store = createStore((state) => state,
      { okapi: { url: 'http://localhost', tenant: 'tenantid' } },
      applyMiddleware(thunk));

    const inst = mount(
      <Root component={FunctionalWrapper} store={store} />
    );
    inst.find(Functional).props().resources.functionalResource.hasLoaded.should.equal(false);

    setTimeout(() => {
      inst.find(Functional).instance().props.resources.functionalResource.hasLoaded.should.equal(true);
      inst.find(Functional).instance().props.resources.functionalResource.records.length.should.equal(5);
      fetchMock.restore();
      done();
    }, 10);
  });

  it('should fail appropriately', (done) => {
    class ErrorProne extends Component {
      static manifest = { errorProne: {
        type: 'okapi',
        path: () => 'turnep',
      } };
      render() {
        return <div id="somediv"></div>
      }
    };
    const ErrorProneWrapper = ({ connect }) => {
      const ConnectedErrorProne = connect(ErrorProne);
      return <ConnectedErrorProne/>
    };
    fetchMock
      .get('http://localhost/turnep',
        { status: 404 })
      .post('http://localhost/turnep',
        { status: 403, body: 'You are forbidden because reasons.' })
      .catch(503);

    const store = createStore((state) => state,
      { okapi: { url: 'http://localhost', tenant: 'tenantid' } },
      applyMiddleware(thunk));

    const inst = mount(
      <Root component={ErrorProneWrapper} store={store} />
    );
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

  it('should accumulate records', (done) => {
    class Acc extends Component {
      static manifest = { accResource: {
        type: 'okapi',
        accumulate: true,
        path: 'turnip',
      } };
      render() {
        return <div id="somediv"></div>
      }
    };
    const AccWrapper = ({ connect }) => {
      const ConnectedAcc = connect(Acc);
      return <ConnectedAcc/>
    };
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

    const inst = mount(
      <Root component={AccWrapper} store={store} />
    );

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
    class Child2 extends Component {
      static manifest = { childResource2 : { initialValue: 'child2' } };
      render() {
        return <div id="somediv"></div>
      }
    };
    class Child1 extends Component {
      static manifest = { childResource1 : { initialValue: 'child1' } };
      constructor(props) {
        super(props);
        this.childConnect = props.connect(Child2);
      }
      render() {
        return <this.childConnect connect={this.props.connect} />
      }
    };
    class Parent extends Component {
      static manifest = { parentResource : { initialValue: 'parent' } };
      constructor(props) {
        super();
        this.childConnect = props.connect(Child1);
      }
      render() {
        return this.props.showChild ? (<this.childConnect connect={this.props.connect}/>) : (<div></div>);
      }
    };
    const ParentWrapper = ({ connect, showChild }) => {
      const ConnectedParent = connect(Parent);
      return <ConnectedParent connect={connect} showChild={showChild} />
    };
    const inst = mount(
      <Root showChild={true} component={ParentWrapper} store={createStore((state) => state, {})} />
    );

    inst.find(Child2).props().resources.should.have.property('childResource2');
    inst.find(Child2).props().mutator.should.have.property('childResource2');
    inst.find(Child2).props().resources.childResource2.should.equal('child2');

    inst.setProps({ showChild: false });
    inst.setProps({ showChild: true });

    // These should be still present
    inst.find(Child2).props().resources.should.have.property('childResource2');
    inst.find(Child2).props().mutator.should.have.property('childResource2');

    // instead we are getting these
    //inst.find(Child2).props().resources.should.eql({});
    //inst.find(Child2).props().mutator.should.eql({});
  });

});
