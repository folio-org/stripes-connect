import RESTResource from './RESTResource';

const defaults = {
  pk: 'id',
  clientGeneratePk: true,
  fetch: true,
  clear: true,
  abortable: false,
  abortOnUnmount: false,
  limitParam: 'limit',
  offsetParam: 'offset',
  headers: {
  },
  POST: {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  },
  DELETE: {
    headers: {
      'Accept': 'text/plain',
      'Content-Type': 'application/json',
    },
  },
  GET: {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  },
  PUT: {
    headers: {
      'Accept': 'text/plain',
      'Content-Type': 'application/json',
    },
  },
};

function optionsFromState(options, state) {
  if (options.type === 'okapi') {
    if (typeof state.okapi !== 'object') {
      throw new Error('State does not contain Okapi settings');
    }
    const okapiOptions = {
      root: state.okapi.url,
      headers: {
        'X-Okapi-Tenant': options.tenant || state.okapi.tenant,
        'Accept-Language': state.okapi.locale ?? 'en',
      },
    };
    return okapiOptions;
  }
  return {};
}

export default class OkapiResource extends RESTResource {
  constructor(name, query = {}, module = null, logger, dataKey) {
    query.optionsFromState = optionsFromState;

    super(name, query, module, logger, dataKey, defaults);
    this.visibleCount = 0;
  }

  markVisible() {
    this.visibleCount += 1;
  }

  markInvisible() {
    if (this.visibleCount > 0) {
      this.visibleCount -= 1;
    }
  }

  isVisible() {
    return this.visibleCount > 0;
  }
}
