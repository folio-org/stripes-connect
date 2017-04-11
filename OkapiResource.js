import RESTResource from './RESTResource';

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
  constructor(name, query = {}, module = null, logger) {
    super(name, query, module, logger, defaults);
  }
}
