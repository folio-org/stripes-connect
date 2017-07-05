import orchestrate from 'redux-orchestrate';
import _ from 'lodash';

const middleware = orchestrate();
const actionsName = [
  'CREATE_SUCCESS',
  'UPDATE_SUCCESS',
  'DELETE_SUCCESS',
];

function generateRules(resource) {
  const actionPrefix = resource.crudName.toUpperCase();
  const syncName = resource.optionsTemplate.sync;
  const syncPrefix = `${_.snakeCase(resource.module)}_${_.snakeCase(syncName)}`.toUpperCase();

  return actionsName.map(name => ({
    case: `${actionPrefix}_${name}`,
    dispatch: `${syncPrefix}_${name}`,
  }));
}

function register(resource) {
  const rules = generateRules(resource);
  middleware.addRules(rules);
}

export default {
  register,
  middleware,
};
