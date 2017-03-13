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

// Copied from connect.js, as we don't want to export it there just so we can import it here
const defaultLogger = () => {};
defaultLogger.log = (cat, ...args) => {
  console.log(`stripes-connect (${cat})`, ...args);
};

describe('RESTResource', () => {
  describe('substitutePath()', () => {
    it('replaces path components', () => {
      substitutePath('/whatever/:{id}', props, state, module, defaultLogger)
        .should.equal('/whatever/42');
    });
    it('replaces query parameters', () => {
      substitutePath('/whatever/?{q}/anyways', props, state, module, defaultLogger)
        .should.equal('/whatever/water/anyways');
    });
    it('replaces resources', () => {
      substitutePath('${top}', props, state, module, defaultLogger)
        .should.equal('somestring');
      substitutePath('${nested.bird}', props, state, module, defaultLogger)
        .should.equal('innerstring');
    });
    it('handles multiple', () => {
      substitutePath('/?{q}/${top}/:{id}', props, state, module, defaultLogger)
        .should.equal('/water/somestring/42');
    });
    it('runs functions', () => {
      substitutePath((a, b, c) => a.q + b.id + c.top, props, state, module, defaultLogger)
        .should.equal('water42somestring');
    });
    it('fails appropriately', () => {
      expect(substitutePath('${nothere}', props, state, module, defaultLogger))
        .to.equal(null);
      expect(substitutePath(() => undefined, props, state, module, defaultLogger))
        .to.equal(null);
    });
  });
});

