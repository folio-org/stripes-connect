import { should } from 'chai';
import { describe, it } from 'mocha';

import reducer from '../src/RESTResource/reducer';

should();

const initialResourceState = {
  hasLoaded: false,
  isPending: false,
  failed: false,
  records: [],
  successfulMutations: [],
  failedMutations: [],
  pendingMutations: [],
};

const action = {
  type: '@@stripes-connect/OFFSET_FETCH_SUCCESS',
  payload: [],
  meta: {
    offset: 0
  }
};

const reduce = reducer.bind({});

describe('reduce()', () => {
  it('returns empty array when nothing is passed in', () => {
    reduce(initialResourceState, action).records
      .should.eql([]);
  });

  it('adds new records to beginning when offset of 0 is used', () => {
    reduce(initialResourceState, Object.assign({}, action, { payload: [1, 2, 3] })).records
      .should.eql([1, 2, 3]);
  });
});
