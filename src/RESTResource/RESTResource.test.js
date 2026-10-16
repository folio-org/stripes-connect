import { waitFor } from '@folio/jest-config-stripes/testing-library/react';

import RESTResource, {
  buildOption,
  compilePathTemplate,
  extractTotal,
  processFallback,
  substitute,
  urlFromOptions,
} from './RESTResource';


const state = {
  somemodule_top: 'somestring',
  somemodule_nested: {
    bird: 'innerstring',
  },
};
const props = {
  match: {
    params: {
      id: '42',
    },
  },
  location: {
    search: '?q=water',
  },
  holding: {
    id: '1234'
  },
  propVal: 'my_prop_value'

};
const module = 'somemodule';

// Modified from connect.js, as we don't want to export it there just so we can import it here
const defaultLogger = () => { };
defaultLogger.log = (cat, ...args) => { // eslint-disable-line no-unused-vars
  // console.log(`stripes-connect (${cat})`, ...args);
};

const args = [props, state, module, defaultLogger];

describe('RESTResource', () => {
  describe('substitute()', () => {
    it('replaces path components', () => {
      const res = substitute('/whatever/:{id}', ...args);
      expect(res).toEqual('/whatever/42');
    });

    it('replaces query parameters', () => {
      const res = substitute('/whatever/?{q}/anyways', ...args);
      expect(res).toEqual('/whatever/water/anyways');
    });

    describe('replaces resources', () => {
      it('at the top level', () => {
        const res = substitute('${top}', ...args); // eslint-disable-line no-template-curly-in-string
        expect(res).toEqual('somestring');
      });

      it('when nested', () => {
        const res = substitute('${nested.bird}', ...args); // eslint-disable-line no-template-curly-in-string
        expect(res).toEqual('innerstring');
      });
    });

    it('performs prop substitution', () => {
      const res = substitute('!{propVal}', ...args); // eslint-disable-line no-template-curly-in-string
      expect(res).toEqual('my_prop_value');
    });

    it('handles multiple', () => {
      const res = substitute('/?{q}/${top}/:{id}', ...args); // eslint-disable-line no-template-curly-in-string
      expect(res).toEqual('/water/somestring/42');
    });

    it('runs functions', () => {
      const res = substitute((a, b, c) => a.q + b.id + c.top, ...args);
      expect(res).toEqual('water42somestring');
    });

    describe('fails appropriately', () => {
      it('handles null', () => {
        const res = substitute('${nothere}', ...args); // eslint-disable-line no-template-curly-in-string
        expect(res).toBeNull();
      });
      it('handles undefined', () => {
        const res = substitute(() => undefined, ...args);
        expect(res).toBeUndefined();
      });
    });
  });

  describe('buildOption()', () => {
    it('builds an option derived from a manifest object', () => {
      const res = buildOption({ query: 'holdingsRecordId==!{holding.id}' }, ...args);
      expect(res).toEqual({ query: 'holdingsRecordId==1234' });
    });
    it('builds an option derived from a manifest callback', () => {
      const callback = (parsedQuery, params, resources, logger, cbProps) => ({ // eslint-disable-line no-unused-vars
        parsedQuery,
        params
      });
      const res = buildOption(callback, ...args);
      expect(res).toEqual({
        parsedQuery: { q: 'water' },
        params: { id: '42' }
      });
    });
  });
});

describe('extractTotal', () => {
  it('prefers resultInfo.totalRecords', () => {
    const json = { resultInfo: { totalRecords: 271828 }, totalRecords: 1414, total_records: 314159 };
    expect(extractTotal(json)).toEqual(json.resultInfo.totalRecords);
  });

  it('falls back to totalRecords', () => {
    const json = { totalRecords: 1414, total_records: 314159 };
    expect(extractTotal(json)).toEqual(json.totalRecords);
  });

  it('falls back total_records', () => {
    const json = { total_records: 314159 };
    expect(extractTotal(json)).toEqual(json.total_records);
  });

  it('returns null when all else fails', () => {
    const json = {};
    expect(extractTotal(json)).toBeNull();
  });
});

describe('processFallback', () => {
  describe('handles +', () => {
    it('"key:+replacement" > "replacement" when key maps to anything truthy', () => {
      expect(processFallback('key:+replacement', [], { key: true })).toEqual('replacement');
    });

    it('"key:+replacement" > "" when key is absent', () => {
      expect(processFallback('key:+replacement', [], {})).toEqual('');
    });
  });

  describe('handles -', () => {
    it('"key:-replacement" > "val" when key maps to "val"', () => {
      expect(processFallback('key:-replacement', [], { key: 'val' })).toEqual('val');
    });

    it('"key:-replacement" > "replacement" when key is absent', () => {
      expect(processFallback('key:-replacement', [], { val: 'aaa' })).toEqual('replacement');
    });
  });
});


describe('urlFromOptions', () => {
  it('returns null given null path', () => {
    expect(urlFromOptions({ path: null })).toBeNull();
  });

  it('returns null given null params', () => {
    expect(urlFromOptions({ path: 'path', params: null })).toBeNull();
  });

  it('returns null given any params property with a null value', () => {
    expect(urlFromOptions({ path: 'path', params: { a: 'a', b: null } })).toBeNull();
  });

  it('fills params from staticFallback', () => {
    const options = {
      path: 'path',
      params: { a: 'a', b: null },
      staticFallback: {
        params: {
          b: 'b'
        }
      }
    };
    expect(urlFromOptions(options)).toEqual('/path?a=a&b=b');
  });

  it('returns path when params is undefined', () => {
    expect(urlFromOptions({ path: 'path' })).toEqual('/path');
  });

  it('optionally includes root prefix', () => {
    expect(urlFromOptions({ path: 'path', root: 'root' })).toEqual('root/path');
  });

  describe('handles primary key', () => {
    it('appends it when provided and not already included', () => {
      expect(urlFromOptions({ path: 'path' }, 'SOME_PK')).toEqual('/path/SOME_PK');
    });

    it('does nothing if path ends with it', () => {
      expect(urlFromOptions({ path: 'path/SOME_PK' }, 'SOME_PK')).toEqual('/path/SOME_PK');
    });
  });
});

describe('substitute', () => {
  it('throws errors as necessary', () => {
    const tryMe = () => {
      substitute({}, {}, {}, 'string', { log: jest.fn() });
    };

    expect(tryMe).toThrow(/Invalid type/);
  });
});

describe('compilePathTemplate', () => {
  describe('handles ? (query-params)', () => {
    it('replaces values when satisfied', () => {
      const q = { foo: 'FOO' }; // query
      const p = {};
      const l = {};
      expect(compilePathTemplate('/path/?{foo}/bar', q, p, l)).toEqual('/path/FOO/bar');
    });

    it('returns null when unsatisfied', () => {
      const q = {};
      const p = {};
      const l = {};
      expect(compilePathTemplate('/path/?{foo}/bar', q, p, l)).toBeNull();
    });
  });

  describe('handles : (react-router path components)', () => {
    it('replaces values when satisfied', () => {
      const q = {};
      const p = { match: { params: { foo: 'FOO' } } }; // match, params
      const l = {};
      expect(compilePathTemplate('/path/:{foo}/bar', q, p, l)).toEqual('/path/FOO/bar');
    });

    it('returns null when unsatisfied', () => {
      const q = {};
      const p = {};
      const l = {};
      expect(compilePathTemplate('/path/:{foo}/bar', q, p, l)).toBeNull();
    });
  });

  describe('handles % and $ (resources)', () => {
    it('replaces values when satisfied', () => {
      const q = {};
      const p = {};
      const l = { foo: 'FOO' };
      expect(compilePathTemplate('/path/%{foo}/bar', q, p, l)).toEqual('/path/FOO/bar');
    });
    it('returns null when unsatisfied', () => {
      const q = {};
      const p = {};
      const l = {};
      expect(compilePathTemplate('/path/%{foo}/bar', q, p, l)).toBeNull();
    });
  });

  describe('handles ! (local resources)', () => {
    it('replaces values when satisfied', () => {
      const q = {};
      const p = { foo: 'FOO' };
      const l = {};
      expect(compilePathTemplate('/path/!{foo}/bar', q, p, l)).toEqual('/path/FOO/bar');
    });

    it('returns null when unsatisfied', () => {
      const q = {};
      const p = {};
      const l = {};
      expect(compilePathTemplate('/path/!{foo}/bar', q, p, l)).toBeNull();
    });
  });
});

describe('RESTResource', () => {
  const mockDispatch = jest.fn();
  const mockGetState = jest.fn().mockReturnValue({});
  const mockFetch = jest.fn().mockResolvedValue({});
  const logger = {
    log: jest.fn(),
  };
  let realFetch;

  beforeEach(() => {
    realFetch = global.fetch;
    global.fetch = mockFetch;
    mockDispatch.mockClear();
    mockGetState.mockClear();
  });

  afterAll(() => {
    global.fetch = realFetch;
  });

  describe('when calling fetchAction', () => {
    describe('when \\"records\\" is missing from response', () => {
      beforeEach(() => {
        mockFetch.mockClear().mockResolvedValue({
          url: '/',
          json: jest.fn().mockResolvedValue({
            totalRecords: 1,
          }),
        });
      });

      describe('when using allowUndefinedRecords parameter', () => {
        const restResource = new RESTResource(
          'test-name',
          { query: 'test-query' },
          null,
          logger,
          null,
          {
            records: 'records',
            allowUndefinedRecords: true,
          }
        );

        it('should dispatch fetchSuccess action', async () => {
          restResource.fetchAction({})(mockDispatch, mockGetState);

          await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({
            type: '@@stripes-connect/FETCH_SUCCESS',
            payload: [],
          })));
        });
      });

      describe('when allowUndefinedRecords parameter is false', () => {
        const restResource = new RESTResource(
          'test-name',
          { query: 'test-query' },
          null,
          logger,
          null,
          {
            records: 'records',
            allowUndefinedRecords: false,
          }
        );

        it('should dispatch fetchError action', async () => {
          restResource.fetchAction({})(mockDispatch, mockGetState);

          await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({
            type: '@@stripes-connect/FETCH_ERROR',
            payload: {
              message: 'no records in \'records\' element',
            },
          })));
        });
      });
    });
  });
});
