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
  if (!action.type.startsWith('@@stripes-connect')
    || action.meta.module !== this.module
    || action.meta.resource !== this.name
    || action.meta.dataKey !== this.dataKey) return state;

  switch (action.type) {
    case '@@stripes-connect/FETCH_START': {
      return Object.assign({}, state, { isPending: true });
    }
    case '@@stripes-connect/FETCH_SUCCESS': {
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
    case '@@stripes-connect/ACC_FETCH_SUCCESS': {
      let records;
      if (Array.isArray(action.payload)) records = [...state.records, ...action.payload];
      else records = [...state.records, _.clone(action.payload)];
      return Object.assign({}, state, {
        hasLoaded: true,
        loadedAt: new Date(),
        isPending: false,
        failed: false,
        records,
        ...action.meta,
      });
    }
    case '@@stripes-connect/RESET': {
      return initialResourceState;
    }
    case '@@stripes-connect/CREATE_SUCCESS': {
      return Object.assign({}, state, {
        successfulMutations: [{
          type: 'POST',
          record: action.payload,
        }, ...state.successfulMutations],
      });
    }
    case '@@stripes-connect/UPDATE_SUCCESS': {
      return Object.assign({}, state, {
        successfulMutations: [{
          type: 'PUT',
          record: action.payload,
        }, ...state.successfulMutations],
      });
    }
    case '@@stripes-connect/DELETE_SUCCESS': {
      return Object.assign({}, state, {
        successfulMutations: [{
          type: 'DELETE',
          record: action.payload,
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
    case '@@stripes-connect/FETCH_ABORT': {
      // We do not use action.payload.message
      return initialResourceState;
    }
    default: {
      return state;
    }
  }
}
