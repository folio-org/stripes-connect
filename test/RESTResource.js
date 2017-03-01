import { should, expect } from 'chai';

import { substitutePath, RESTResource } from '../RESTResource';

should();

const props = {
  params: {
    id: '42',
  },
  location: {
    query: {
      q: 'water',
    },
  },
  data: {
    top: 'somestring',
    nested: {
      bird: 'innerstring',
    },
  }
};

describe('RESTResource', () => {
  describe('substitutePath()', () => {
    it('replaces path components', () => {
      substitutePath('/whatever/:{id}', props).should.equal('/whatever/42');
    });
    it('replaces query parameters', () => {
      substitutePath('/whatever/?{q}/anyways', props).should.equal('/whatever/water/anyways');
    });
    it('replaces resources', () => {
      substitutePath('${top}', props).should.equal('somestring');
      substitutePath('${nested.bird}', props).should.equal('innerstring');
    });
    it('handles multiple', () => {
      substitutePath('/?{q}/${top}/:{id}', props).should.equal('/water/somestring/42');
    });
    it('runs functions', () => {
     substitutePath((a, b, c) => a.q + b.id + c.top, props).should.equal('water42somestring');
    });
    it('fails appropriately', () => {
      expect(substitutePath('${nothere}', props)).to.equal(null);
      expect(substitutePath(() => undefined, props)).to.equal(null);
      //   { path: null, dynamicPartsSatisfied: false });
      // substitutePath(() => null, props).should.deep.equal(
      //   { path: null, dynamicPartsSatisfied: false });
    });
  });
});

