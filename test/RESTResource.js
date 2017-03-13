import { should, expect } from 'chai';

import { substitutePath, RESTResource } from '../RESTResource';

should();

const module = 'somemodule';
const state = {
  somemodule_top: 'somestring',
  somemodule_nested: {
    bird: 'innerstring',
  },
};
const props = {
  params: {
    id: '42',
  },
  location: {
    query: {
      q: 'water',
    },
  },
};

// Modified from connect.js, as we don't want to export it there just so we can import it here
const defaultLogger = () => {};
defaultLogger.log = (cat, ...args) => {
  // console.log(`stripes-connect (${cat})`, ...args);
};

const args = [props, state, module, defaultLogger];

describe('RESTResource', () => {
  describe('substitutePath()', () => {
    it('replaces path components', () => {
      substitutePath('/whatever/:{id}', ...args)
        .should.equal('/whatever/42');
    });
    it('replaces query parameters', () => {
      substitutePath('/whatever/?{q}/anyways', ...args)
        .should.equal('/whatever/water/anyways');
    });
    it('replaces resources', () => {
      substitutePath('${top}', ...args)
        .should.equal('somestring');
      substitutePath('${nested.bird}', ...args)
        .should.equal('innerstring');
    });
    it('handles multiple', () => {
      substitutePath('/?{q}/${top}/:{id}', ...args)
        .should.equal('/water/somestring/42');
    });
    it('runs functions', () => {
      substitutePath((a, b, c) => a.q + b.id + c.top, ...args)
        .should.equal('water42somestring');
    });
    it('fails appropriately', () => {
      expect(substitutePath('${nothere}', ...args))
        .to.equal(null);
      expect(substitutePath(() => undefined, ...args))
        .to.equal(null);
    });
  });
});

