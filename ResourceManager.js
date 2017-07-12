import OkapiResource from './OkapiResource';
import RESTResource from './RESTResource';
import LocalResource from './LocalResource';

const defaultType = 'local';
const types = {
  local: LocalResource,
  okapi: OkapiResource,
  rest: RESTResource,
};

export default class ResourceManager {
  constructor(module, logger) {
    this.resources = [];
    this.resourceRegister = {}; // map of resource names to resource objects
    this.module = module;
    this.logger = logger;
  }

  create(manifest, props) {
    // this.resources = []; // references to a subset of class-level resources
    _.forOwn(manifest, (query, name) => {
      if (!name.startsWith('@')) {
        // Regular manifest entries describe resources
        const dk = props.dataKey;
        const dkName = `${name}${dk === undefined ? '' : `-${dk}`}`;

        if (!this.resourceRegister[dkName]) {
          const resource = new types[query.type || defaultType](name, query, this.module, this.logger, props.dataKey);
          this.resources.push(resource);
          this.resourceRegister[dkName] = resource;
          // this.resources.push(resource);
        }
      } else if (name === '@errorHandler') {
        // XXX It doesn't really make sense to do this for each instance in the class
        // setErrorHandler(query);
      } else {
        console.log(`WARNING: ${this.module} ignoring unsupported special manifest entry '${name}'`);
      }
    });
  }

  init(context) {
    // this.logger.log('connect', `in componentWillMount for ${Wrapped.name}`);
    if (!(context.addReducer)) {
      throw new Error('No addReducer function available in component context');
    }

    this.resources.forEach((resource) => {
      // Hopefully paging can all be absorbed into the resource in some future
      // rearchitecting (we might also reiterate these function definitions a
      // few million less times)
      if (resource.pagingReducer) {
        const pagingKey = `${resource.stateKey()}_paging`;
        context.addReducer(pagingKey, resource.pagingReducer);
        const store = context.store;
        const onPageSuccess = (paging) => {
          const records = paging.reduce((acc, val) => acc.concat(val.records), []);
          store.dispatch(resource.pagedFetchSuccess(records));
          store.dispatch(resource.fetchSuccess111(paging[paging.length - 1].meta, records));
        };
        const onPageChange = (paging) => {
          const allDone = paging.reduce((acc, val) => acc && val.isComplete, true);
          if (allDone && paging.length > 0) onPageSuccess(paging);
        };
        let currentPaging;
        const pagingListener = () => {
          const previousPaging = currentPaging;
          currentPaging = store.getState()[pagingKey];
          if (currentPaging && currentPaging !== previousPaging) onPageChange(currentPaging);
        };
        store.subscribe(pagingListener);
      }

      context.addReducer(`${resource.stateKey()}111`, resource.reducer111);
      context.addReducer(resource.stateKey(), resource.reducer);

      // TODO this may move, but while it's here, it's going to be called
      // more than necessary
      if (typeof resource.init === 'function') {
        resource.init(context.store);
      }
    });

    //context.addReducer(`@@error-${this.module}`, errorReducer);
  }

  getResources() {
    return this.resources;
  }

  markVisible() {
    this.resources.forEach(resource => {
      if (resource instanceof OkapiResource) {
        resource.markVisible();
      }
    });
  }

  markInvisible() {
    this.resources.forEach(resource => {
      if (resource instanceof OkapiResource) {
        resource.markInvisible();
      }
    });
  }
}
