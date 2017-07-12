import RESTResource from './RESTResource';
import sideEffects from './sideEffects';

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
  },
  PUT: {
    headers: {
      'Accept': 'text/plain',
      'Content-Type': 'application/json',
    },
  },
};

export default class OkapiResource extends RESTResource {
  constructor(name, query = {}, module = null, logger, dataKey) {
    super(name, query, module, logger, dataKey, defaults);
    this.visibleCount = 0;
    sideEffects.register(this);
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
