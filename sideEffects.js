import orchestrate from 'redux-orchestrate';
import _ from 'lodash';

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

function getSyncAction(module, syncName) {
  return `${_.snakeCase(module)}_${_.snakeCase(syncName)}_sync`.toUpperCase();
}

function register(resource, syncName) {
  const actionNames = getActionNames(resource.crudName);
  const syncAction = getSyncAction(resource.module, syncName);
  const rules = [{
    case: actionNames,
    dispatch: syncAction,
  }];

  orchestrate.addRules(rules);
}

export default { register };
