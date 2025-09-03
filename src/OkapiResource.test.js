import OkapiResource from './OkapiResource';

describe('OkapiResource', () => {
  describe('OkapiResource', () => {
    it('visible defaults to false', () => {
      const res = new OkapiResource();
      expect(res.isVisible()).toBe(false);
    });

    it('markVisible() raises visibility', () => {
      const res = new OkapiResource();
      res.markVisible();

      expect(res.isVisible()).toBe(true);
    });

    it('markInvisible() lowers visibility', () => {
      const res = new OkapiResource();

      res.markVisible();
      res.markInvisible();
      expect(res.isVisible()).toBe(false);
    });

    it('markInvisible() has no effect when visibleCount is already zero', () => {
      const res = new OkapiResource();

      res.markInvisible();
      expect(res.isVisible()).toBe(false);
    });
  });

  describe('optionsFromState', () => {
    const okapiResource = new OkapiResource();
    const optionsFromState = okapiResource.optionsFromState;

    it('tenant from options overrides tenant from state', () => {
      const options = {
        type: 'okapi',
        tenant: 'tenant1',
      };
      const state = {
        okapi: {
          url: 'url',
          tenant: 'tenant2',
        },
      };

      const res = optionsFromState(options, state);
      expect(res.headers['X-Okapi-Tenant']).toEqual(options.tenant);
    });

    it('returns tenant from state if it does not exist in options', () => {
      const options = { type: 'okapi' };
      const state = {
        okapi: {
          tenant: 'tenant2',
        },
      };

      const res = optionsFromState(options, state);
      expect(res.headers['X-Okapi-Tenant']).toEqual(state.okapi.tenant);
    });

    it('returns token from state', () => {
      const options = { type: 'okapi' };
      const state = {
        okapi: {
          tenant: 'tenant2',
          token: 'token',
        },
      };

      const res = optionsFromState(options, state);
      expect(res.headers['X-Okapi-Tenant']).toEqual(state.okapi.tenant);
      expect(res.headers['X-Okapi-Token']).toEqual(state.okapi.token);
    });

    it('type is not okapi', () => {
      const options = { type: 'giraffe' };
      const state = {};

      const res = optionsFromState(options, state);
      expect(res).toEqual({});
    });

    it('state.okapi is not a valid object', () => {
      const options = { type: 'okapi' };
      const state = {
        okapi: 'string'
      };

      const fx = () => {
        optionsFromState(options, state);
      };

      expect(fx).toThrow(/State does not contain Okapi settings/);
    });
  });
});
