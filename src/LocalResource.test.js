import LocalResource from './LocalResource';

describe('LocalResource', () => {
  describe('update', () => {
    it('dispatch receives update', () => {
      const dispatch = jest.fn();
      const res = new LocalResource('name');
      const { update } = res.getMutator(dispatch);
      const payload = 'payload';

      update(payload);
      expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
        payload,
        type: '@@stripes-connect/LOCAL_UPDATE'
      }));
    });

    it('updates existing resource', () => {
      const dispatch = (data) => data;
      const resource = new LocalResource('name', {}, 'module');
      const { update } = resource.getMutator(dispatch);
      const oldState = { same: 'same', different: 'different' };
      const newState = { different: 'DIFFERENT' };
      const res = resource.reducer(oldState, update(newState));

      expect(res).toMatchObject({
        ...oldState,
        ...newState,
      });
    });
  });

  describe('replace', () => {
    it('dispatch receives replace', () => {
      const dispatch = jest.fn();
      const res = new LocalResource('name');
      const { replace } = res.getMutator(dispatch);
      const payload = 'replace';

      replace(payload);
      expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
        payload,
        type: '@@stripes-connect/LOCAL_REPLACE'
      }));
    });

    it('replaces existing resource', () => {
      const dispatch = (data) => data;
      const resource = new LocalResource('name', {}, 'module');
      const { replace } = resource.getMutator(dispatch);
      const oldState = { same: 'same', different: 'different' };
      const newState = { different: 'DIFFERENT' };
      const res = resource.reducer(oldState, replace(newState));

      expect(res).toMatchObject(newState);
    });
  });

  describe('reducer', () => {
    it('unknown action returns existing state', () => {
      const resource = new LocalResource('name', {}, 'module');
      const oldState = { same: 'same', different: 'different' };

      const action = {
        type: 'unknown',
        meta: {
          module: 'module',
          resource: 'name',
        }
      };
      const res = resource.reducer(oldState, action);

      expect(res).toMatchObject(oldState);
    });

    it('undefined action.meta returns existing state', () => {
      const resource = new LocalResource('name', {}, 'module');
      const oldState = { same: 'same', different: 'different' };

      const action = {};
      const res = resource.reducer(oldState, action);

      expect(res).toMatchObject(oldState);
    });

    it('unmatched action.meta.module returns existing state', () => {
      const resource = new LocalResource('name', {}, 'module');
      const oldState = { same: 'same', different: 'different' };

      const action = {
        meta: {
          module: 'unmatched'
        }
      };
      const res = resource.reducer(oldState, action);

      expect(res).toMatchObject(oldState);
    });

    it('unmatched action.meta.resource returns existing state', () => {
      const resource = new LocalResource('name', {}, 'module');
      const oldState = { same: 'same', different: 'different' };

      const action = {
        meta: {
          module: 'module',
          resource: 'unmatched'
        }
      };
      const res = resource.reducer(oldState, action);

      expect(res).toMatchObject(oldState);
    });

    it('unmatched action.meta.dataKey returns existing state', () => {
      const resource = new LocalResource('name', {}, 'module');
      const oldState = { same: 'same', different: 'different' };

      const action = {
        meta: {
          resource: 'name',
          module: 'module',
          dataKey: 'unmatched'
        }
      };
      const res = resource.reducer(oldState, action);

      expect(res).toMatchObject(oldState);
    });

    it('state defaults to query.initialValue', () => {
      const oldState = { same: 'same' };
      const resource = new LocalResource(
        'name',
        { initialValue: oldState },
        'module'
      );

      const action = {
        meta: {
          resource: 'name',
          module: 'module',
        }
      };
      const res = resource.reducer(undefined, action);

      expect(res).toMatchObject(oldState);
    });
  });

  describe('stateKey', () => {
    it('concatenates module and name', () => {
      const resource = new LocalResource('name', {}, 'module');
      expect(resource.stateKey()).toEqual('module_name');
    });

    it('prefixes value with dataKey', () => {
      const resource = new LocalResource('name', {}, 'module', null, 'key');
      expect(resource.stateKey()).toEqual('key#module_name');
    });
  });

  describe('shouldRefresh', () => {
    it('returns false resource key matches', () => {
      const resource = new LocalResource('name', {}, 'module', null, 'key');
      const props = { resources: { name: 'match' } };
      const nextProps = { resources: { name: 'match' } };
      expect(resource.shouldRefresh(props, nextProps)).toBe(false);
    });

    it('returns true when resource key does not match', () => {
      const resource = new LocalResource('name', {}, 'module', null, 'key');
      const props = { resources: { name: 'match' } };
      const nextProps = { resources: { name: 'nope nopitty nope nope' } };
      expect(resource.shouldRefresh(props, nextProps)).toBe(true);
    });
  });
});
