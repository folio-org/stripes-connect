import RESTResource from './RESTResource';

const defaults = {
  pk: 'id',
  clientGeneratePk: true,
  fetch: true,
  headers: {
    'Authorization': 'y', // Authorization to be implemented
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
  constructor(name, query = {}, module = null) {
    super(name, query, module, defaults);
  }
}
