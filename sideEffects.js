import orchestrate from 'redux-orchestrate';

const ACTION_NAMES = [
  'FETCH_SUCCESS111',
  'FETCH_SUCCESS',
  'CREATE_SUCCESS',
  'DELETE_SUCCESS',
  'UPDATE_SUCCESS',
];

function getActionNames(crudName) {
  const prefix = crudName.toUpperCase();
  return ACTION_NAMES.map(name => `${prefix}_${name}`);
}

function register(resource) {
  const actionNames = getActionNames(resource.crudName);
  const rules = [{
    case: actionNames,
    dispatch: `${resource.stateKey().toUpperCase()}_SYNC`,
  }];

  orchestrate.addRules(rules);
}

export default { register };
