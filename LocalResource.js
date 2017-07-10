/* eslint-env browser */

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

  oldActionApplies = (action) => {
    if (action.meta && action.meta.module && action.meta.resource) {
      const key = `${action.meta.dataKey ? `${action.meta.dataKey}#` : ''}${action.meta.module}-${action.meta.resource}`;
      return key === this.stateKey();
    }
    return false;
  }

  newActionApplies = action => (action.meta !== undefined &&
                                action.meta.module === this.module &&
                                action.meta.resource === this.name &&
                                action.meta.dataKey === this.dataKey);

  // I want to switch for the old actionApplies to the new, but for now will verify they really are equivalent
  actionApplies = (action) => {
    const oldRes = this.oldActionApplies(action);
    const newRes = this.newActionApplies(action);
    if (newRes !== oldRes) alert(`oldRes=${oldRes}, newRes=${newRes}`);
    return oldRes;
  }

  reducer = (state = {}, action) => {
    if (this.actionApplies(action)) {
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
