import RESTResource from './RESTResource';

const MAX_RECORDS = '2000';

const defaults = {
  pk: 'id',
  clientGeneratePk: true,
  fetch: true,
  clear: true,
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
    params: {
      'limit': MAX_RECORDS,
    }
  },
  PUT: {
    headers: {
      'Accept': 'text/plain',
      'Content-Type': 'application/json',
    },
  },
};

function optionsFromState(options, state) {
  if (options.type === 'lookup') {
    if (typeof state.okapi !== 'object') {
      throw new Error('State does not contain Okapi settings');
    }
    const okapiOptions = {
      root: state.okapi.url,
      headers: {
        'X-Okapi-Tenant': state.okapi.tenant,
      },
    };
    if (state.okapi.token) okapiOptions.headers['X-Okapi-Token'] = state.okapi.token;
    return okapiOptions;
  }
  return {};
}

export default class OkapiLookupResource extends RESTResource {
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
