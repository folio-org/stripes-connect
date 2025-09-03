import { substitute, buildOption } from './RESTResource';

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
