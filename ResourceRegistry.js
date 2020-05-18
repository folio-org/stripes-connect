import forOwn from 'lodash/forOwn';

export default class ResourceRegistry {
  constructor() {
    this.registry = {};
  }

  register(module, resource) {
    if (!this.registry[module]) {
      this.registry[module] = {};
    }

    this.registry[module][resource.name] = resource;
  }

  getResources(module, manifest) {
    const resources = [];

    forOwn(manifest, (_, name) => {
      resources.push(this.registry[module][name]);
    });

    return resources;
  }

  clear() {
    this.registry = {};
  }
}
