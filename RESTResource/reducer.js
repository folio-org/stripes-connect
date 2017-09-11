import _ from 'lodash';

const initialResourceState = {
  hasLoaded: false,
  isPending: false,
  failed: false,
  records: [],
  successfulMutations: [],
  failedMutations: [],
  pendingMutations: [],
};

export default function (state = initialResourceState, action) {
  const dataKey = action.meta ? action.meta.dataKey : undefined;
  if (dataKey !== this.dataKey) return state;

  if (action.type.startsWith('@@stripes-connect')) {
    if (action.meta.module !== this.module || action.meta.resource !== this.name) {
      return state;
    }
  }
  const prefix = this.crudName.toUpperCase();
  switch (action.type) {
    case `${prefix}_FETCH_START`: {
      return Object.assign({}, state, { isPending: true });
    }
    case `${prefix}_FETCH_SUCCESS111`: {
      let records;
      if (Array.isArray(action.payload)) records = [...action.payload];
      else records = [_.clone(action.payload)];
      return Object.assign({}, state, {
        hasLoaded: true,
        loadedAt: new Date(),
        isPending: false,
        failed: false,
        records,
        ...action.meta,
      });
    }
    case `${prefix}_CREATE_SUCCESS`: {
      return Object.assign({}, state, {
        successfulMutations: [{
          type: 'POST',
          record: action.record,
        }, ...state.successfulMutations],
      });
    }
    case `${prefix}_UPDATE_SUCCESS`: {
      return Object.assign({}, state, {
        successfulMutations: [{
          type: 'PUT',
          record: action.record,
        }, ...state.successfulMutations],
      });
    }
    case `${prefix}_DELETE_SUCCESS`: {
      return Object.assign({}, state, {
        successfulMutations: [{
          type: 'DELETE',
          record: action.record,
        }, ...state.successfulMutations],
      });
    }
    case '@@stripes-connect/MUTATION_ERROR': {
      return Object.assign({}, state, {
        failedMutations: [{
          ...action.meta,
          ...action.payload,
        }, ...state.failedMutations],
      });
    }
    case '@@stripes-connect/FETCH_ERROR': {
      return Object.assign({}, state, {
        isPending: false,
        failed: Object.assign({}, action.meta, action.payload),
      });
    }
    default: {
      return state;
    }
  }
}
