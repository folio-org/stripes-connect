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

describe('RESTResource', () => {
  describe('substitutePath()', () => {
    it('replaces path components', () => {
      substitutePath('/whatever/:{id}', props, state, module)
        .should.equal('/whatever/42');
    });
    it('replaces query parameters', () => {
      substitutePath('/whatever/?{q}/anyways', props, state, module)
        .should.equal('/whatever/water/anyways');
    });
    it('replaces resources', () => {
      substitutePath('${top}', props, state, module).should.equal('somestring');
      substitutePath('${nested.bird}', props, state, module).should.equal('innerstring');
    });
    it('handles multiple', () => {
      substitutePath('/?{q}/${top}/:{id}', props, state, module).should.equal('/water/somestring/42');
    });
    it('runs functions', () => {
     substitutePath((a, b, c) => a.q + b.id + c.top, props, state, module).should.equal('water42somestring');
    });
    it('fails appropriately', () => {
      expect(substitutePath('${nothere}', props, state, module)).to.equal(null);
      expect(substitutePath(() => undefined, props, state, module)).to.equal(null);
    });
  });
});

