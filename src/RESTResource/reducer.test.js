import reducer, { initialResourceState, REDUCER_ACTIONS } from './reducer';

const action = {
  type: '',
  payload: [],
  meta: {
    offset: 0
  }
};

const reduce = reducer.bind({});

describe('reduce()', () => {
  describe('FETCH_START', () => {
    it('sets isPending to true', () => {
      const a = { ...action, type: REDUCER_ACTIONS.FETCH_START };
      const res = reduce(initialResourceState, a);
      expect(res).toMatchObject({ ...initialResourceState, isPending: true });
    });
  });

  describe('FETCH_SUCCESS', () => {
    it('replaces state.records with action.payload\'s array', () => {
      const prevState = { ...initialResourceState, records: [{ foo: 'foo' }] };
      const a = { ...action, type: REDUCER_ACTIONS.FETCH_SUCCESS, payload: [{ bar: 'bar' }] };
      const res = reduce(prevState, a);
      expect(res.hasLoaded).toBe(true);
      expect(res.records).toMatchObject(a.payload);
    });

    it('replaces state.records with action.payload', () => {
      const prevState = { ...initialResourceState, records: [{ foo: 'foo' }] };
      const a = { ...action, type: REDUCER_ACTIONS.FETCH_SUCCESS, payload: { bar: 'bar' } };
      const res = reduce(prevState, a);
      expect(res.hasLoaded).toBe(true);
      expect(res.records).toMatchObject([a.payload]);
    });
  });

  describe('ACC_FETCH_SUCCESS', () => {
    it('supplements state.records with action.payload\'s list', () => {
      const prevState = { ...initialResourceState, records: [{ foo: 'foo' }] };
      const a = { ...action, type: REDUCER_ACTIONS.ACC_FETCH_SUCCESS, payload: [{ bar: 'bar' }] };
      const res = reduce(prevState, a);
      expect(res.hasLoaded).toBe(true);
      expect(res.records).toMatchObject([...prevState.records, ...a.payload]);
    });

    it('supplements state.records with action.payload\'s item', () => {
      const prevState = { ...initialResourceState, records: [{ foo: 'foo' }] };
      const a = { ...action, type: REDUCER_ACTIONS.ACC_FETCH_SUCCESS, payload: { bar: 'bar' } };
      const res = reduce(prevState, a);
      expect(res.hasLoaded).toBe(true);
      expect(res.records).toMatchObject([...prevState.records, a.payload]);
    });
  });

  describe('OFFSET_FETCH_SUCCESS', () => {
    it('returns empty array when nothing is passed in', () => {
      const a = { ...action, type: REDUCER_ACTIONS.OFFSET_FETCH_SUCCESS };

      const res = reduce(initialResourceState, a);
      expect(res.records).toEqual([]);
    });

    it('adds new records to beginning when offset of 0 is used', () => {
      const a = { ...action, type: REDUCER_ACTIONS.OFFSET_FETCH_SUCCESS };
      const res = reduce(initialResourceState, { ...a, payload: [1, 2, 3] });
      expect(res.records).toEqual([1, 2, 3]);
    });

    it('adds new record to beginning when offset of 0 is used', () => {
      const a = { ...action, type: REDUCER_ACTIONS.OFFSET_FETCH_SUCCESS };
      const res = reduce(initialResourceState, { ...a, payload: { foo: 'foo' } });
      expect(res.records).toMatchObject([{ foo: 'foo' }]);
    });
  });

  describe('OFFSET_FETCH_SPARSE_SLICE_SUCCESS', () => {
    it('edge offset fills with undefined, then replaces values', () => {
      const a = { ...action, type: REDUCER_ACTIONS.OFFSET_FETCH_SPARSE_SLICE_SUCCESS };
      const state = { ...initialResourceState, records: ['a'] };
      const res = reduce(state, {
        ...a,
        meta: { offset: 2 },
        payload: ['b', 'c']
      });
      expect(res.hasLoaded).toBe(true);
      expect(res.records).toMatchObject([undefined, undefined, 'b', 'c']);
    });

    it('overlapping offset fills with undefined, then updates values', () => {
      const a = { ...action, type: REDUCER_ACTIONS.OFFSET_FETCH_SPARSE_SLICE_SUCCESS };
      const state = { ...initialResourceState, records: ['a', 'b'] };
      const res = reduce(state, {
        ...a,
        meta: { offset: 1 },
        payload: ['B', 'C']
      });
      expect(res.hasLoaded).toBe(true);
      expect(res.records).toMatchObject([undefined, 'B', 'C']);
    });

    it('non-array value does not pad sparse array', () => {
      const a = { ...action, type: REDUCER_ACTIONS.OFFSET_FETCH_SPARSE_SLICE_SUCCESS };
      const state = { ...initialResourceState, records: ['a', 'b'] };
      const res = reduce(state, {
        ...a,
        meta: { offset: 2 },
        payload: 'B'
      });
      expect(res.hasLoaded).toBe(true);
      expect(res.records).toMatchObject(['B']);
    });
  });

  describe('RESET', () => {
    it('returns initialResourceState', () => {
      const a = { ...action, type: REDUCER_ACTIONS.RESET };
      const res = reduce(initialResourceState, { ...a, payload: { foo: 'foo' } });
      expect(res).toMatchObject(initialResourceState);
    });
  });

  describe('CREATE_SUCCESS', () => {
    it('includes successful POST', () => {
      const a = { ...action, type: REDUCER_ACTIONS.CREATE_SUCCESS };
      const payload = { foo: 'foo' };
      const res = reduce(initialResourceState, { ...a, payload });
      expect(res).toMatchObject({
        ...initialResourceState,
        successfulMutations: [{
          type: 'POST',
          record: payload,
        }],
      });
    });
  });

  describe('UPDATE_SUCCESS', () => {
    it('includes successful POST', () => {
      const a = { ...action, type: REDUCER_ACTIONS.UPDATE_SUCCESS };
      const payload = { foo: 'foo' };
      const res = reduce(initialResourceState, { ...a, payload });
      expect(res).toMatchObject({
        ...initialResourceState,
        successfulMutations: [{
          type: 'PUT',
          record: payload,
        }],
      });
    });
  });

  describe('DELETE_SUCCESS', () => {
    it('includes successful DELETE', () => {
      const a = { ...action, type: REDUCER_ACTIONS.DELETE_SUCCESS };
      const payload = { foo: 'foo' };
      const res = reduce(initialResourceState, { ...a, payload });
      expect(res).toMatchObject({
        ...initialResourceState,
        successfulMutations: [{
          type: 'DELETE',
          record: payload,
        }],
      });
    });
  });

  describe('MUTATION_ERROR', () => {
    it('returns failed mutations', () => {
      const payload = { foo: 'foo' };
      const a = {
        type: REDUCER_ACTIONS.MUTATION_ERROR,
        payload,
        meta: 'meta'
      };
      const res = reduce(initialResourceState, a);
      expect(res).toMatchObject({
        ...initialResourceState,
        failedMutations: [{
          ...a.meta,
          ...a.payload,
        }],
      });
    });
  });

  describe('FETCH_ERROR', () => {
    it('returns failed action meta', () => {
      const payload = { foo: 'foo' };
      const a = {
        type: REDUCER_ACTIONS.FETCH_ERROR,
        payload,
        meta: { key: 'value' },
      };
      const res = reduce(initialResourceState, a);

      expect(res).toMatchObject({
        ...initialResourceState,
        isPending: false,
        failed: {
          ...payload,
          ...a.meta,
        },
      });
    });
  });

  describe('FETCH_ABORT', () => {
    it('returns initialResourceState', () => {
      const a = { ...action, type: REDUCER_ACTIONS.FETCH_ABORT };
      const res = reduce(initialResourceState, { ...a, payload: { foo: 'foo' } });
      expect(res).toMatchObject(initialResourceState);
    });
  });

  describe('unmatched action returns initialResourceState', () => {
    it('unmatched @@stripes-connect action', () => {
      const a = { ...action, type: '@@stripes-connect/unmatched' };

      const res = reduce(initialResourceState, a);
      expect(res).toEqual(initialResourceState);
    });

    it('utterly unmatched action', () => {
      const a = { ...action, type: 'unmatched' };

      const res = reduce(initialResourceState, a);
      expect(res).toEqual(initialResourceState);
    });
  });

  it('state defaults to initialResourceState', () => {
    const a = { ...action, type: 'unmatched' };

    const res = reduce(undefined, a);
    expect(res).toMatchObject(initialResourceState);
  });
});
