import { shouldResourceRefresh } from './refreshEpic';

describe('shouldResourceRefresh', () => {
  it('resource.isVisible() returns false', () => {
    const action = { meta: { path: 'path' } };
    const resource = { isVisible: () => false };
    const res = shouldResourceRefresh(action, resource);
    expect(res).toEqual(false);
  });

  it('resource provides shouldRefresh()', () => {
    const action = { meta: { path: 'path' } };
    const resource = {
      isVisible: () => true,
      optionsTemplate: {
        shouldRefresh: jest.fn(() => false),
      }
    };
    const res = shouldResourceRefresh(action, resource);
    expect(resource.optionsTemplate.shouldRefresh).toHaveBeenCalled();
    expect(res).toEqual(false);
  });

  describe('optionsTemplate', () => {
    it('optionsTemplate.path overrides optionsTemplate.GET.path', () => {
      const action = { meta: { path: 'matches' } };
      const resource = {
        isVisible: () => true,
        optionsTemplate: {
          path: 'matches',
          GET: { path: 'does-not-match' },
        }
      };
      const res = shouldResourceRefresh(action, resource);
      expect(res).toEqual(true);
    });

    it('falls back to optionsTemplate.GET.path if optionsTemplate.path is falsy', () => {
      const action = { meta: { path: 'matches' } };
      const resource = {
        isVisible: () => true,
        optionsTemplate: {
          path: '',
          GET: { path: 'matches' },
        }
      };
      const res = shouldResourceRefresh(action, resource);
      expect(res).toEqual(true);
    });

    it('optionsTemplate.path defaults to empty string', () => {
      const action = { meta: { path: '' } };
      const resource = {
        isVisible: () => true,
        optionsTemplate: {}
      };
      const res = shouldResourceRefresh(action, resource);
      expect(res).toEqual(true);
    });

    it('optionsTemplate.path and meta.path do not match', () => {
      const action = { meta: { path: 'funky' } };
      const resource = {
        isVisible: () => true,
        optionsTemplate: {
          path: 'chicken'
        }
      };
      const res = shouldResourceRefresh(action, resource);
      expect(res).toEqual(false);
    });

    it('optionsTemplate.path and meta.path match', () => {
      const action = { meta: { path: 'zippo' } };
      const resource = {
        isVisible: () => true,
        optionsTemplate: {
          path: 'zippo'
        }
      };
      const res = shouldResourceRefresh(action, resource);
      expect(res).toEqual(true);
    });
  });

  it('uses cachedProps\' compiled path', () => {
    const action = { meta: { path: 'match' } };
    const resource = {
      cachedProps: {
        root: {
          store: {
            getState: jest.fn(),
          },
        },
      },
      isVisible: () => true,
      verbOptions: jest.fn(() => ({ path: 'match' })),
      optionsTemplate: {},
    };

    const res = shouldResourceRefresh(action, resource);
    expect(res).toEqual(true);
    expect(resource.verbOptions).toHaveBeenCalled();
  });
});
