import JSDOMEnvironment from 'jest-environment-jsdom';

// jsdom does not provide the fetch API; fetch-mock needs it, so borrow node's.
export default class JSDOMWithFetch extends JSDOMEnvironment {
  constructor(...args) {
    super(...args);
    const g = this.global;
    g.fetch = fetch;
    g.Headers = Headers;
    g.Request = Request;
    g.Response = Response;
    g.ReadableStream = ReadableStream;
    g.TextEncoder = TextEncoder;
    g.TextDecoder = TextDecoder;
    g.AbortController = AbortController;
    g.AbortSignal = AbortSignal;
  }
}
