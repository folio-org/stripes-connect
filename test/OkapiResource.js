import { expect } from 'chai';
import { describe, it } from 'mocha';

import OkapiResource from '../OkapiResource';

describe('OkapiResource', () => {
  describe('optionsFromState', () => {
    const okapiResource = new OkapiResource();
    const optionsFromState = okapiResource.optionsFromState;

    it('should return tenant from options', () => {
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

      expect(optionsFromState(options, state).headers['X-Okapi-Tenant']).to.eql(options.tenant);
    });

    it('should return tenant from state if it does not exist in options', () => {
      const options = { type: 'okapi' };
      const state = {
        okapi: {
          tenant: 'tenant2',
        },
      };

      expect(optionsFromState(options, state).headers['X-Okapi-Tenant']).to.eql(state.okapi.tenant);
    });
  });
});
