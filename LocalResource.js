import _ from 'lodash';

export default class LocalResource {
  constructor(name, query = {}, module = null, logger, dataKey) {
    this.name = name;
    this.query = query;
    this.module = module;
    this.logger = logger; // not presently needed, but may be down the line
    this.dataKey = dataKey;
  }

  getMutator = dispatch => ({
    update: newData => dispatch(this.updateAction(newData)),
    replace: newData => dispatch(this.replaceAction(newData)),
  })

  updateAction = newData => ({
    type: '@@stripes-connect/LOCAL_UPDATE',
    payload: newData,
    meta: {
      module: this.module,
      resource: this.name,
      dataKey: this.dataKey,
    },
  })

  replaceAction = newData => ({
    type: '@@stripes-connect/LOCAL_REPLACE',
    payload: newData,
    meta: {
      module: this.module,
      resource: this.name,
      dataKey: this.dataKey,
    },
  })

  stateKey = () => `${this.dataKey ? `${this.dataKey}#` : ''}${_.snakeCase(this.module)}_${this.name}`;

  reducer = (state = this.query.initialValue !== undefined ? this.query.initialValue : {}, action) => {
    if (action.meta !== undefined &&
        action.meta.module === this.module &&
        action.meta.resource === this.name &&
        action.meta.dataKey === this.dataKey) {
      switch (action.type) {
        case '@@stripes-connect/LOCAL_UPDATE': {
          return Object.assign({}, state, action.payload);
        }
        case '@@stripes-connect/LOCAL_REPLACE': {
          return action.payload;
        }
        default: {
          return state;
        }
      }
    } else {
      return state;
    }
  }
}
