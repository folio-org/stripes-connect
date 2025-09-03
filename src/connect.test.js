import AbortController from 'abort-controller';
import React, { Component } from 'react';
import { createStore, applyMiddleware, combineReducers } from 'redux';
import { Provider } from 'react-redux';
import thunk from 'redux-thunk';
import fetchMock from 'fetch-mock';
import { render, screen, waitFor } from '@folio/jest-config-stripes/testing-library/react';

import ConnectContext from './ConnectContext';

import { connect } from './connect';

global.window.AbortController = AbortController;

const stringify = (resources = {}, mutator = {}) => {
  return (
    <div>
      <div data-testid="resources">{JSON.stringify(resources)}</div>
      <div data-testid="mutator">{JSON.stringify(mutator)}</div>
    </div>
  );
};

const jsonify = (element) => {
  try {
    if (element.textContent) {
      return JSON.parse(element.textContent);
    }
    return '';
  } catch (e) {
    return '';
  }
};

// Provide a redux store and addReducer() function in context
const reducers = { okapi: (state = {}) => state };
class Root extends Component {
  addReducer = (key, reducer) => {
    if (reducers[key] === undefined) {
      reducers[key] = reducer;
      this.props.store.replaceReducer(combineReducers({ ...reducers }));
      return true;
    }
    return false;
  }

  render() {
    // return (<div>{[JSON.stringify(this.props.resources), JSON.stringify(this.props.mutator)]}</div>);
    const { component: ToTest, hideConnected } = this.props;
    return (
      <Provider store={this.props.store}>
        <ConnectContext.Provider value={{ addReducer: this.addReducer, addEpic: this.addEpic, store: this.props.store }}>
          {!hideConnected && <ToTest fooProp="foo" {...this.props} />}
        </ConnectContext.Provider>
      </Provider>
    );
  }
}

const defaultLogger = () => { };
defaultLogger.log = (cat, ...args) => { };  // eslint-disable-line no-unused-vars

const mockedEpics = {
  add: () => { }
};

class Simple extends Component { // eslint-disable-line react/no-multi-comp
  render() {
    return stringify(this.props.resources, this.props.mutator);
  }
}

class Local extends Component { // eslint-disable-line react/no-multi-comp
  render() {
    return stringify(this.props.resources, this.props.mutator);
  }
}
Local.manifest = { localResource: { initialValue: 'hi' } };

class Remote extends Component { // eslint-disable-line react/no-multi-comp
  render() {
    return stringify(this.props.resources, this.props.mutator);
  }
}
Remote.manifest = {
  remoteResource: {
    type: 'okapi',
    path: 'turnip',
  }
};

const Accumulated = () => (props) => stringify(props.resources, this.props.mutator);
Accumulated.manifest = {
  accumulated: {
    type: 'okapi',
    path: 'accumulated',
    accumulate: true,
    abortable: true,
  },
};

const Unmounted = () => (props) => stringify(props.resources, this.props.mutator);
Unmounted.manifest = {
  unmounted: {
    type: 'okapi',
    path: 'unmounted',
    abortOnUnmount: true,
  },
};

class Paged extends Component { // eslint-disable-line react/no-multi-comp
  render() {
    return stringify(this.props.resources, this.props.mutator);
  }
}
Paged.manifest = {
  pagedResource: {
    type: 'okapi',
    path: 'turnip',
    params: { q: 'dinner' },
    records: 'records',
    recordsRequired: 20,
    perRequest: 5,
  }
};

class PagedOffset extends Component { // eslint-disable-line react/no-multi-comp
  render() {
    return stringify(this.props.resources, this.props.mutator);
  }
}
PagedOffset.manifest = {
  pagedResource: {
    type: 'okapi',
    path: 'turnip',
    params: { q: 'dinner', offset: '5' },
    records: 'records',
    offsetParam: 'offset',
    perRequest: 5,
  }
};

class Sparsed extends Component {
  render() {
    return stringify(this.props.resources, this.props.mutator);
  }
}
Sparsed.manifest = {
  sparsedResource: {
    type: 'okapi',
    path: 'turnip',
    params: { q: 'dinner', offset: '5' },
    records: 'records',
    offsetParam: 'offset',
    perRequest: 5,
    resultOffset: 5,
    resultDensity: 'sparse',
  },
};

class CompWithPerms extends Component { // eslint-disable-line react/no-multi-comp
  render() {
    return stringify(this.props.resources, this.props.mutator);
  }
}
CompWithPerms.manifest = {
  resourceWithPerms: {
    type: 'okapi',
    path: () => 'turnip',
    GET: {
      params: () => ({ q: 'dinner' }),
    },
    permissionsRequired: 'perm1,perm2',
  }
};

class Conditional extends Component { // eslint-disable-line react/no-multi-comp
  render() {
    return stringify(this.props.resources, this.props.mutator);
  }
}
Conditional.manifest = {
  yes: {
    type: 'okapi',
    path: 'turnip',
    fetch: (props) => {
      if (props.fooProp !== 'foo') throw new Error('Props not passed to condition function');
      return true;
    }
  },
  no: {
    type: 'okapi',
    path: 'turnip',
    fetch: () => false
  }
};

class CompWithParams extends Component { // eslint-disable-line react/no-multi-comp
  render() {
    return stringify(this.props.resources, this.props.mutator);
  }
}
CompWithParams.manifest = {
  resourceWithParams: {
    type: 'okapi',
    path: 'turnip?id=!{id}',
  },
};

class Functional extends Component { // eslint-disable-line react/no-multi-comp
  render() {
    return stringify(this.props.resources, this.props.mutator);
  }
}
Functional.manifest = {
  functionalResource: {
    type: 'okapi',
    path: () => 'turnip',
    GET: {
      params: () => ({ q: 'dinner' }),
    }
  }
};

class ErrorProne extends Component { // eslint-disable-line react/no-multi-comp
  render() {
    return stringify(this.props.resources, this.props.mutator);
  }
}
ErrorProne.manifest = {
  errorProne: {
    type: 'okapi',
    path: () => 'turnep',
  }
};

class Acc extends Component { // eslint-disable-line react/no-multi-comp
  render() {
    return stringify(this.props.resources, this.props.mutator);
  }
}
Acc.manifest = {
  accResource: {
    type: 'okapi',
    accumulate: true,
    path: 'turnip',
  }
};

class Child2 extends Component { // eslint-disable-line react/no-multi-comp
  static manifest = { childResource2: { initialValue: 'child2' } };

  render() {
    return stringify(this.props.resources, this.props.mutator);
  }
}

class Child1 extends Component { // eslint-disable-line react/no-multi-comp
  static manifest = { childResource1: { initialValue: 'child1' } };

  constructor() {
    super();
    this.childConnect = connect(Child2, 'child2', mockedEpics, defaultLogger);
  }

  render() {
    return <this.childConnect />;
  }
}

class Parent extends Component { // eslint-disable-line react/no-multi-comp
  static manifest = { parentResource: { initialValue: 'parent' } };

  constructor() {
    super();
    this.childConnect = connect(Child1, 'child1', mockedEpics, defaultLogger);
  }

  render() {
    return this.props.showChild ? (<this.childConnect />) : (<div />); // eslint-disable-line react/prop-types
  }
}

describe('connect()', () => {
  beforeEach(() => {
    fetchMock.restore();
  });

  it('should pass through a component with no manifest', async () => {
    // Simple.should.equal(connect(Simple, 'NoModule', mockedEpics, defaultLogger));
    const store = createStore((state) => state,
      { okapi: { url: 'http://localhost', tenant: 'tenantid' } },
      applyMiddleware(thunk));

    const Connected = connect(Simple, 'testoffset', mockedEpics, defaultLogger);
    render(<Root store={store} component={Connected} />);
    await waitFor(() => {
      const r = jsonify(screen.getByTestId('resources'));
      expect(r).toEqual({});
    });
  });

  it('should successfully wrap a component with a local resource', async () => {
    const store = createStore((state) => state, {});
    const Connected = connect(Local, 'test', mockedEpics, defaultLogger);
    render(<Root store={store} component={Connected} />);
    await waitFor(() => {
      const r = jsonify(screen.getByTestId('resources'));
      expect(r.localResource).toEqual('hi');
      expect(r.localResource).toEqual('hi');
    });

    // TODO
    // inst.findByType(Local).props.resources.localResource.should.equal('hi');
    // inst.findByType(Local).props.mutator.localResource.replace({ boo: 'ya' });
    // inst.findByType(Local).props.resources.localResource.boo.should.equal('ya');
    // inst.findByType(Local).props.mutator.localResource.update({ boo: 'urns' });
    // inst.findByType(Local).props.resources.localResource.boo.should.equal('urns');
  });

  it.skip('should successfully wrap a component with an okapi resource', async () => {
    fetchMock
      .get('http://localhost/turnip',
        [{ id: 1, someprop: 'someval' }],
        { headers: { 'Content-Type': 'application/json' } })
      .put('http://localhost/turnip/1',
        { id: 1, someprop: 'new' },
        { status: 200, headers: { 'Content-Type': 'application/json' } })
      .post('http://localhost/turnip',
        { id: 1, someprop: 'newer' },
        { headers: { 'Content-Type': 'application/json' } })
      .delete('http://localhost/turnip/1',
        { id: 1, someprop: 'someval' },
        { headers: { 'Content-Type': 'application/json' } })
      .catch({ status: 503 });

    const store = createStore((state) => state,
      { okapi: { url: 'http://localhost', tenant: 'tenantid' } },
      applyMiddleware(thunk));
    const Connected = connect(Remote, 'test', mockedEpics, defaultLogger);
    render(<Root store={store} component={Connected} showChild />);

    await waitFor(() => {
      const r = jsonify(screen.getByTestId('resources'));
    });

    // inst.findByType(Remote).props.mutator.remoteResource.PUT({ id: 1, someprop: 'new' })
    //   .then(res => res.someprop.should.equal('new'));
    // fetchMock.lastCall()[1].body.should.equal('{"id":1,"someprop":"new"}');
    // fetchMock.lastCall()[1].headers['X-Okapi-Tenant'].should.equal('tenantid');

    // inst.findByType(Remote).props.mutator.remoteResource.DELETE({ id: 1 });
    // fetchMock.lastCall()[0].should.equal('http://localhost/turnip/1');

    // inst.findByType(Remote).props.mutator.remoteResource.POST({ someprop: 'newer' })
    //   .then(res => res.someprop.should.equal('newer'));
    // // Confirm UUID is generated
    // fetchMock.lastCall()[1].body.length.should.equal(64);

    // setTimeout(() => {
    //   inst.findByType(Remote).props.resources.remoteResource.records[0].someprop.should.equal('someval');
    //   inst.findByType(Remote).props.resources.remoteResource.successfulMutations[0].record.someprop.should.equal('newer');
    //   fetchMock.restore();
    //   done();
    // }, 10);
  });

  it('should make multiple requests for a paged resource', async () => {
    fetchMock
      .getOnce('http://localhost/turnip?limit=5&q=dinner',
        { records: [{ 'id': '58e5356fe84698a0a279a903', 'name': 'Alberta' }, { 'id': '58e5356f364668c082d3d87a', 'name': 'David' }, { 'id': '58e5356ff56928961932c1db', 'name': 'Roxie' }, { 'id': '58e5356ff66b0af6f1332145', 'name': 'Tammy' }, { 'id': '58e5356fd18c30d6c63503c6', 'name': 'Sanford' }], total_records: 14 },
        { headers: { 'Content-Type': 'application/json' } })
      .getOnce('http://localhost/turnip?limit=5&offset=5&q=dinner',
        { records: [{ 'id': '58e55786065039ceb9acb0e2', 'name': 'Lucas' }, { 'id': '58e55786e2106a216fdb5629', 'name': 'Kirkland' }, { 'id': '58e55786819013f1e810d28e', 'name': 'Clarke' }, { 'id': '58e55786e51f01bc81b11f32', 'name': 'Acevedo' }, { 'id': '58e55786791c37697eec2bc2', 'name': 'Earnestine' }], total_records: 14 },

        { headers: { 'Content-Type': 'application/json' } })
      .getOnce('http://localhost/turnip?limit=5&offset=10&q=dinner',
        { records: [{ 'id': '58e557e48b8b56d0bea22460', 'name': 'Dillon' }, { 'id': '58e557e46120e13590013272', 'name': 'Cain' }, { 'id': '58e557e41c2e37143a990445', 'name': 'Gordon' }, { 'id': '28e257e41c2e37143a990445', 'name': 'Giddeon' }], total_records: 14 },
        { headers: { 'Content-Type': 'application/json' } })
      .catch(503);

    const store = createStore((state) => state,
      { okapi: { url: 'http://localhost', tenant: 'tenantid' } },
      applyMiddleware(thunk));

    const Connected = connect(Paged, 'test', mockedEpics, defaultLogger);
    render(<Root store={store} component={Connected} />);
    await waitFor(() => {
      const r = jsonify(screen.getByTestId('resources'));
      expect(r.pagedResource.records).toHaveLength(14);
    });
  });

  it('should only make 1 request for a paged offset resource', async () => {
    fetchMock
      .getOnce('http://localhost/turnip?limit=5&offset=5&q=dinner',
        { records: [{ 'id': '58e55786065039ceb9acb0e2', 'name': 'Lucas' }, { 'id': '58e55786e2106a216fdb5629', 'name': 'Kirkland' }, { 'id': '58e55786819013f1e810d28e', 'name': 'Clarke' }, { 'id': '58e55786e51f01bc81b11f32', 'name': 'Acevedo' }, { 'id': '58e55786791c37697eec2bc2', 'name': 'Earnestine' }], total_records: 5 },
        { headers: { 'Content-Type': 'application/json' } })
      .catch(503);

    const store = createStore((state) => state,
      { okapi: { url: 'http://localhost', tenant: 'tenantid' } },
      applyMiddleware(thunk));

    const Connected = connect(PagedOffset, 'testoffset', mockedEpics, defaultLogger);
    render(<Root store={store} component={Connected} />);

    await waitFor(() => {
      const r = jsonify(screen.getByTestId('resources'));
      expect(r.pagedResource.hasLoaded).toBe(true);
      expect(r.pagedResource.records).toHaveLength(5);
    });
  });

  it('should run manifest functions', async () => {
    fetchMock
      .get('http://localhost/turnip?q=dinner',
        [{ 'id': '58e5356fe84698a0a279a903', 'name': 'Alberta' }, { 'id': '58e5356f364668c082d3d87a', 'name': 'David' }, { 'id': '58e5356ff56928961932c1db', 'name': 'Roxie' }, { 'id': '58e5356ff66b0af6f1332145', 'name': 'Tammy' }, { 'id': '58e5356fd18c30d6c63503c6', 'name': 'Sanford' }],
        { headers: { 'Content-Type': 'application/json' } })
      .catch(503);

    const store = createStore((state) => state,
      { okapi: { url: 'http://localhost', tenant: 'tenantid' } },
      applyMiddleware(thunk));

    const Connected = connect(Functional, 'test', mockedEpics, defaultLogger);
    render(<Root store={store} component={Connected} />);

    await waitFor(() => {
      const r = jsonify(screen.getByTestId('resources'));
      expect(r.functionalResource.hasLoaded).toBe(true);
      expect(r.functionalResource.records).toHaveLength(5);
    });
  });

  it('should fail to connect an undefined (unimported?) component', () => {
    const connectNull = () => {
      connect(undefined, 'test2', mockedEpics, defaultLogger);
    };

    expect(connectNull).toThrow(/called on an undefined component from test2/);
  });

  it('should handle get failure', async () => {
    fetchMock
      .get('http://localhost/turnep',
        { status: 404, body: 'forbidden' })
      .post('http://localhost/turnep',
        { status: 403, body: 'You are forbidden because reasons.' })
      .catch({ status: 503 });

    const store = createStore((state) => state,
      { okapi: { url: 'http://localhost', tenant: 'tenantid' } },
      applyMiddleware(thunk));

    const Connected = connect(ErrorProne, 'test', mockedEpics, defaultLogger);
    render(<Root store={store} component={Connected} />);

    await waitFor(() => {
      const r = jsonify(screen.getByTestId('resources'));
      // const m = jsonify(screen.getByTestId('mutator'));

      expect(r.errorProne.isPending).toEqual(false);
      expect(r.errorProne.failed.httpStatus).toEqual(404);
    });

    // inst.findByType(ErrorProne).props.mutator.errorProne.POST({ id: 1, someprop: 'new' })
    //   .catch(err => err.text().then(msg => msg.should.equal('You are forbidden because reasons.')));

    // setTimeout(() => {
    //   const res = inst.findByType(ErrorProne).props.resources.errorProne;

    //   res.isPending.should.equal(false);
    //   res.failed.httpStatus.should.equal(404);
    //   res.failedMutations[0].message.should.equal('You are forbidden because reasons.');
    //   fetchMock.restore();
    //   done();
    // }, 10);
  });

  it('should fail because of missing permissions', async () => {
    fetchMock
      .get('http://localhost/turnip?q=dinner',
        [{ 'id': '58e5356fe84698a0a279a903', 'name': 'Alberta' }],
        { headers: { 'Content-Type': 'application/json' } });

    const store = createStore((state) => state,
      { okapi: { url: 'http://localhost', tenant: 'tenantid', currentPerms: { perm1: true } } },
      applyMiddleware(thunk));

    const Connected = connect(CompWithPerms, 'test2', mockedEpics, defaultLogger);
    render(<Root store={store} component={Connected} />);

    await waitFor(() => {
      const r = jsonify(screen.getByTestId('resources'));
      expect(r.resourceWithPerms.hasLoaded).toBe(false);
      expect(r.resourceWithPerms.isPending).toBe(false);
    });
  });

  it('should make a request because required permissions are present', async () => {
    fetchMock
      .get('http://localhost/turnip?q=dinner',
        [{ 'id': '58e5356fe84698a0a279a903', 'name': 'Alberta' }],
        { headers: { 'Content-Type': 'application/json' } });

    const store = createStore((state) => state,
      { okapi: { url: 'http://localhost', tenant: 'tenantid', currentPerms: { perm1: true, perm2: true, perm3: true } } },
      applyMiddleware(thunk));

    const Connected = connect(CompWithPerms, 'test1', mockedEpics, defaultLogger);
    render(<Root store={store} component={Connected} />);

    await waitFor(() => {
      const r = jsonify(screen.getByTestId('resources'));
      expect(r.resourceWithPerms.hasLoaded).toBe(true);
      expect(r.resourceWithPerms.isPending).toBe(false);
      expect(r.resourceWithPerms.records).toHaveLength(1);
    });
  });

  it('should respect conditions', async () => {
    fetchMock
      .get('http://localhost/turnip',
        [{ 'id': '58e5356fe84698a0a279a903', 'name': 'Alberta' }],
        { headers: { 'Content-Type': 'application/json' } });

    const store = createStore((state) => state,
      { okapi: { url: 'http://localhost', tenant: 'tenantid' } },
      applyMiddleware(thunk));

    const Connected = connect(Conditional, 'test', mockedEpics, defaultLogger);
    render(<Root store={store} component={Connected} />);

    await waitFor(() => {
      const r = jsonify(screen.getByTestId('resources'));
      expect(r.yes.hasLoaded).toBe(true);
      expect(r.yes.isPending).toBe(false);

      expect(r.no.hasLoaded).toBe(false);
      expect(r.no.isPending).toBe(false);
    });
  });

  it.skip('should accumulate records', async () => {
    fetchMock
      .get('http://localhost/turnip',
        [{ id: 1, someprop: 'someval' }],
        { headers: { 'Content-Type': 'application/json' } })
      .get('http://localhost/parsnip',
        [{ id: 2, someprop: 'otherval' }],
        { headers: { 'Content-Type': 'application/json' } })
      .get('http://localhost/potato',
        { status: 403, body: 'No potato.' })
      .catch(503);

    const store = createStore((state) => state,
      { okapi: { url: 'http://localhost', tenant: 'tenantid' } },
      applyMiddleware(thunk));

    const Connected = connect(Acc, 'test', mockedEpics, defaultLogger);
    render(<Root store={store} component={Connected} />);

    await waitFor(() => {
      const r = jsonify(screen.getByTestId('resources'));
    });


    // inst.findByType(Acc).props.mutator.accResource.GET({});
    // inst.findByType(Acc).props.mutator.accResource.GET({ path: 'parsnip' })
    //   .then(rec => rec[0].someprop.should.equal('otherval'));
    // inst.findByType(Acc).props.mutator.accResource.GET({ path: 'potato' })
    //   .catch(err => err.httpStatus.should.equal(403));

    // setTimeout(() => {
    //   const res = inst.findByType(Acc).props.resources.accResource;
    //   res.records[0].someprop.should.equal('someval');
    //   res.records[1].someprop.should.equal('otherval');
    //   inst.findByType(Acc).props.mutator.accResource.reset();
    //   inst.findByType(Acc).props.resources.accResource.records.length.should.equal(0);
    //   fetchMock.restore();
    //   done();
    // }, 10);
  });

  it('should reconnect previously connected component', async () => {
    const store = createStore((state) => state, {});
    const Connected = connect(Parent, 'test', mockedEpics, defaultLogger);
    const { rerender } = render(<Root store={store} component={Connected} showChild />);

    await waitFor(() => {
      const r = jsonify(screen.getByTestId('resources'));
      const m = jsonify(screen.getByTestId('mutator'));
      expect(r.childResource2).toEqual('child2');
      expect(m.childResource2).not.toBeNull();
    });

    rerender(<Root store={store} component={Connected} />);
    expect(screen.queryByTestId('resources')).toBeNull();
    expect(screen.queryByTestId('mutator')).toBeNull();

    rerender(<Root store={store} component={Connected} showChild />);

    await waitFor(() => {
      const r = jsonify(screen.getByTestId('resources'));
      const m = jsonify(screen.getByTestId('mutator'));
      expect(r.childResource2).toEqual('child2');
      expect(m.childResource2).not.toBeNull();
    });
  });

  it('should cancel request when connected component unmounts', async () => {
    fetchMock
      .get('http://localhost/unmounted',
        [{ id: 1 }],
        {
          delay: 1000,
          headers: { 'Content-Type': 'application/json' }
        });

    const store = createStore((state) => state,
      { okapi: { url: 'http://localhost', tenant: 'tenantid' } },
      applyMiddleware(thunk));

    const Connected = connect(Unmounted, 'test', mockedEpics, defaultLogger);
    const { rerender } = render(<Root store={store} component={Connected} id={1} />);
    rerender(<Root store={store} component={Connected} id={1} hideConnected />);

    await waitFor(() => {
      const state = store.getState();
      expect(state.test_unmounted.hasLoaded).toBe(false);
      expect(state.test_unmounted.isPending).toBe(false);
    });
  });

  it.skip('should cancel all requests when the cancel is executed manually', async () => {
    fetchMock
      .get('http://localhost/accumulated',
        [{ id: 1, someprop: 'someval' }],
        { delay: 1000, headers: { 'Content-Type': 'application/json' } });

    const store = createStore((state) => state,
      { okapi: { url: 'http://localhost', tenant: 'tenantid' } },
      applyMiddleware(thunk));

    const Connected = connect(Accumulated, 'test', mockedEpics, defaultLogger);
    render(<Root store={store} component={Connected} />);

    await waitFor(() => {
      const r = jsonify(screen.getByTestId('resources'));
    });


    // inst.findByType(Accumulated).props.mutator.accumulated.GET();
    // inst.findByType(Accumulated).props.mutator.accumulated.cancel();

    // setTimeout(() => {
    //   const state = store.getState();
    //   state.test_accumulated.hasLoaded.should.equal(false);
    //   state.test_accumulated.isPending.should.equal(false);
    //   done();
    // }, 10);
  });

  it('should build sparse array', async () => {
    fetchMock
      .get('http://localhost/turnip?limit=5&offset=5&q=dinner',
        {
          records: [
            { 'id': '58e55786065039ceb9acb0e2', 'name': 'Lucas' },
            { 'id': '58e55786e2106a216fdb5629', 'name': 'Kirkland' },
            { 'id': '58e55786819013f1e810d28e', 'name': 'Clarke' },
          ],
          total_records: 10
        },
        {
          headers: { 'Content-Type': 'application/json' }
        }).catch(503);

    const store = createStore((state) => state,
      { okapi: { url: 'http://localhost', tenant: 'tenantid' } },
      applyMiddleware(thunk));

    const Connected = connect(Sparsed, 'sparsed', mockedEpics, defaultLogger);
    render(<Root store={store} component={Connected} />);

    await waitFor(() => {
      const r = jsonify(screen.getByTestId('resources'));
      expect(r.sparsedResource.hasLoaded).toBe(true);
      expect(r.sparsedResource.records).toHaveLength(8);
      for (let i = 0; i < 5; i++) {
        expect(r.sparsedResource.records[i]).toBeFalsy();
      }
    });
  });
});

describe('Connect - data-fetching according to props', () => {
  let store;
  let Connected;

  it('should should fetch initial data', async () => {
    fetchMock
      .get('http://localhost/turnip?id=1',
        [{ id: 1, someprop: 'someval' }],
        { headers: { 'Content-Type': 'application/json' } })
      .get('http://localhost/turnip?id=2',
        [{ id: 2, someprop: 'otherval' }],
        { headers: { 'Content-Type': 'application/json' } });

    store = createStore((state) => state,
      { okapi: { url: 'http://localhost', tenant: 'tenantid' } },
      applyMiddleware(thunk));

    Connected = connect(CompWithParams, 'test', mockedEpics, defaultLogger);
    render(<Root store={store} component={Connected} id={1} />);

    await waitFor(() => {
      const r = jsonify(screen.getByTestId('resources'));
      expect(r.resourceWithParams.records[0].someprop).toBe('someval');
    });
  });

  it('updating props', async () => {
    render(<Root store={store} component={Connected} id={2} />);

    await waitFor(() => {
      const r = jsonify(screen.getByTestId('resources'));
      expect(r.resourceWithParams.records[0].someprop).toBe('otherval');
    });
  });
});
