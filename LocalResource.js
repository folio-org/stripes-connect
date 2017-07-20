export default class LocalResource {
  constructor(name, query = {}, module = null, logger, dataKey) {
    this.name = name;
    this.query = query;
    this.module = module;
    this.logger = logger; // not presently needed, but may be down the line
    this.dataKey = dataKey;
    this.reducer111 = this.reducer;
  }

  init = (store) => {
    if (!(this.stateKey() in store) && this.query.initialValue) {
      store.dispatch(this.replaceAction(this.query.initialValue));
    }
  }

  getMutator = dispatch => ({
    update: newData => dispatch(this.updateAction(newData)),
    replace: newData => dispatch(this.replaceAction(newData)),
  })

  updateAction = newData => ({
    type: 'STRIPESLOCALSTATE_UPDATE',
    payload: newData,
    meta: {
      module: this.module,
      resource: this.name,
      dataKey: this.dataKey,
    },
  })

  replaceAction = newData => ({
    type: 'STRIPESLOCALSTATE_REPLACE',
    payload: newData,
    meta: {
      module: this.module,
      resource: this.name,
      dataKey: this.dataKey,
    },
  })

  stateKey = () => `${this.dataKey ? `${this.dataKey}#` : ''}${this.module}-${this.name}`;

  reducer = (state = {}, action) => {
    if (action.meta !== undefined &&
        action.meta.module === this.module &&
        action.meta.resource === this.name &&
        action.meta.dataKey === this.dataKey) {
      switch (action.type) {
        case 'STRIPESLOCALSTATE_UPDATE': {
          return Object.assign({}, state, action.payload);
        }
        case 'STRIPESLOCALSTATE_REPLACE': {
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
