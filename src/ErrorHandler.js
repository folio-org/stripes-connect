function naiveErrorHandler(e) {
  // eslint-disable-next-line prefer-template
  alert(`ERROR: in module ${e.module}, operation ${e.op} on resource `
        + `'${e.resource}' failed`
        + (e.status ? ` with HTTP status ${e.status}` : '')
        + (e.error ? `, saying: ${e.error}` : ''));
}

export default class ErrorHandler {
  constructor(module) {
    this.handler = null;
  }

  add(handler, force) {
    if (force || !this.handler) {
      this.handler = handler;
    }
  }

  get() {
    return this.handler;
  }

  addNaive() {
    this.add(naiveErrorHandler, false);
  }
}
