import orchestrate from 'redux-orchestrate';
import _ from 'lodash';

const middleware = orchestrate();
const actionsName = [
  'CREATE_SUCCESS',
  'UPDATE_SUCCESS',
  'DELETE_SUCCESS',
];

function getMutationRules(resource) {
  const actionPrefix = resource.crudName.toUpperCase();
  const options = resource.optionsTemplate;

  return actionsName.map(name => ({
    case: `${actionPrefix}_${name}`,
    dispatch: (action, state) => {
      const path = options.path.replace(/[\?|:|%].*$/g, '');
      const name = resource.name;
      const meta = Object.assign({}, action.meta, { path, name });
      return { ...action, meta, type: 'REFRESH' };
    },
  }));
}

function getRefreshRule(resource) {
  return {
    case: 'REFRESH',
    dispatch: (action, state) => {
      const { name, path } = action.meta;
      if (
        resource.isVisible() &&
        resource.name != name &&
        path.match(resource.optionsTemplate.path)) {
        // TODO: refresh resource
      }
    },
  };
}

function addRules(resource) {
  const rules = getMutationRules(resource);
  rules.push(getRefreshRule(resource));
  middleware.addRules(rules);
}

export default {
  addRules,
  middleware,
};
