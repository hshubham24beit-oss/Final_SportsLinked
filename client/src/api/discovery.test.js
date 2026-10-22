import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('./client', () => ({ default: apiMock }));

const { discoveryApi } = await import('./discovery.api');

describe('discoveryApi', () => {
  beforeEach(() => {
    Object.values(apiMock).forEach((mock) => mock.mockReset());
  });

  it('removes blank and false filters without dropping zero values', () => {
    discoveryApi.searchAthletes({
      page: 1,
      q: '',
      lat: 0,
      lng: 0,
      statMin: 0,
      nearMe: false,
      availableForTrials: true,
    });

    expect(apiMock.get).toHaveBeenCalledWith('/discovery/athletes', {
      params: {
        page: 1,
        lat: 0,
        lng: 0,
        statMin: 0,
        availableForTrials: true,
      },
    });
  });

  it('encodes athlete ids for saved-candidate routes', () => {
    discoveryApi.saveCandidate('abc/123');
    discoveryApi.removeSavedCandidate('abc/123');

    expect(apiMock.post).toHaveBeenCalledWith('/discovery/saved/abc%2F123');
    expect(apiMock.delete).toHaveBeenCalledWith('/discovery/saved/abc%2F123');
  });
});
