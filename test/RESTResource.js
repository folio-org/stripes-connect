import { should, expect } from 'chai';
import { describe, it } from 'mocha';

import { substitute } from '../RESTResource/RESTResource';

should();

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
};
const module = 'somemodule';

// Modified from connect.js, as we don't want to export it there just so we can import it here
const defaultLogger = () => {};
defaultLogger.log = (cat, ...args) => { // eslint-disable-line no-unused-vars
  // console.log(`stripes-connect (${cat})`, ...args);
};

const args = [props, state, module, defaultLogger];

describe('RESTResource', () => {
  describe('substitute()', () => {
    it('replaces path components', () => {
      substitute('/whatever/:{id}', ...args)
        .should.equal('/whatever/42');
    });

    it('replaces query parameters', () => {
      substitute('/whatever/?{q}/anyways', ...args)
        .should.equal('/whatever/water/anyways');
    });

    it('replaces resources', () => {
      substitute('${top}', ...args) // eslint-disable-line no-template-curly-in-string
        .should.equal('somestring');
      substitute('${nested.bird}', ...args) // eslint-disable-line no-template-curly-in-string
        .should.equal('innerstring');
    });

    it('handles multiple', () => {
      substitute('/?{q}/${top}/:{id}', ...args) // eslint-disable-line no-template-curly-in-string
        .should.equal('/water/somestring/42');
    });

    it('runs functions', () => {
      substitute((a, b, c) => a.q + b.id + c.top, ...args)
        .should.equal('water42somestring');
    });

    it('fails appropriately', () => {
      expect(substitute('${nothere}', ...args)) // eslint-disable-line no-template-curly-in-string
        .to.equal(null);
      expect(substitute(() => undefined, ...args))
        .to.equal(undefined);
    });
  });
});
