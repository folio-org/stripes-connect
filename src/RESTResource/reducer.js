import _ from 'lodash';

export const initialResourceState = {
  hasLoaded: false,
  isPending: false,
  failed: false,
  records: [],
  successfulMutations: [],
  failedMutations: [],
  pendingMutations: [],
};

export const REDUCER_ACTIONS = {
  FETCH_START: '@@stripes-connect/FETCH_START',
  FETCH_SUCCESS: '@@stripes-connect/FETCH_SUCCESS',
  ACC_FETCH_SUCCESS: '@@stripes-connect/ACC_FETCH_SUCCESS',
  OFFSET_FETCH_SUCCESS: '@@stripes-connect/OFFSET_FETCH_SUCCESS',
  OFFSET_FETCH_SPARSE_SLICE_SUCCESS: '@@stripes-connect/OFFSET_FETCH_SPARSE_SLICE_SUCCESS',
  RESET: '@@stripes-connect/RESET',
  CREATE_SUCCESS: '@@stripes-connect/CREATE_SUCCESS',
  UPDATE_SUCCESS: '@@stripes-connect/UPDATE_SUCCESS',
  DELETE_SUCCESS: '@@stripes-connect/DELETE_SUCCESS',
  MUTATION_ERROR: '@@stripes-connect/MUTATION_ERROR',
  FETCH_ERROR: '@@stripes-connect/FETCH_ERROR',
  FETCH_ABORT: '@@stripes-connect/FETCH_ABORT',

  PAGING_START: '@@stripes-connect/PAGING_START',
  PAGE_START: '@@stripes-connect/PAGE_START',
  PAGE_SUCCESS: '@@stripes-connect/PAGE_SUCCESS',
};

export default function reducer(state = initialResourceState, action) {
  if (!action.type.startsWith('@@stripes-connect')
    || action.meta.module !== this.module
    || action.meta.resource !== this.name
    || action.meta.dataKey !== this.dataKey) return state;

  switch (action.type) {
    case REDUCER_ACTIONS.FETCH_START: {
      return Object.assign({}, state, { isPending: true });
    }
    case REDUCER_ACTIONS.FETCH_SUCCESS: {
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
    case REDUCER_ACTIONS.ACC_FETCH_SUCCESS: {
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
    case REDUCER_ACTIONS.OFFSET_FETCH_SUCCESS: {
      const records = [...state.records];
      if (Array.isArray(action.payload)) records.splice(action.meta.offset, 0, ...action.payload);
      else records.splice(action.meta.offset, 0, _.clone(action.payload));
      return Object.assign({}, state, {
        hasLoaded: true,
        loadedAt: new Date(),
        isPending: false,
        failed: false,
        records,
        ...action.meta,
      });
    }
    case REDUCER_ACTIONS.OFFSET_FETCH_SPARSE_SLICE_SUCCESS: {
      let tempArray = [];
      let remove = 0;

      if (Array.isArray(action.payload)) {
        let dataLength = action.meta.offset;

        if (action.meta.offset < state.records.length) {
          dataLength = state.records.length;
          remove = action.payload.length;
        }

        tempArray = new Array(dataLength);
        tempArray.splice(action.meta.offset, remove, ...action.payload);
      } else {
        tempArray.splice(action.meta.offset, remove, _.clone(action.payload));
      }

      return Object.assign({}, state, {
        hasLoaded: true,
        loadedAt: new Date(),
        isPending: false,
        failed: false,
        records: tempArray,
        ...action.meta,
      });
    }
    case REDUCER_ACTIONS.RESET: {
      return initialResourceState;
    }
    case REDUCER_ACTIONS.CREATE_SUCCESS: {
      return Object.assign({}, state, {
        successfulMutations: [{
          type: 'POST',
          record: action.payload,
        }, ...state.successfulMutations],
      });
    }
    case REDUCER_ACTIONS.UPDATE_SUCCESS: {
      return Object.assign({}, state, {
        successfulMutations: [{
          type: 'PUT',
          record: action.payload,
        }, ...state.successfulMutations],
      });
    }
    case REDUCER_ACTIONS.DELETE_SUCCESS: {
      return Object.assign({}, state, {
        successfulMutations: [{
          type: 'DELETE',
          record: action.payload,
        }, ...state.successfulMutations],
      });
    }
    case REDUCER_ACTIONS.MUTATION_ERROR: {
      return Object.assign({}, state, {
        failedMutations: [{
          ...action.meta,
          ...action.payload,
        }, ...state.failedMutations],
      });
    }
    case REDUCER_ACTIONS.FETCH_ERROR: {
      return Object.assign({}, state, {
        isPending: false,
        failed: Object.assign({}, action.meta, action.payload),
      });
    }
    case REDUCER_ACTIONS.FETCH_ABORT: {
      // We do not use action.payload.message
      return initialResourceState;
    }
    default: {
      return state;
    }
  }
}
