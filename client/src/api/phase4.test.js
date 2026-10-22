import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('./client', () => ({ default: apiMock }));

const { opportunitiesApi } = await import('./opportunities.api');
const { applicationsApi } = await import('./applications.api');
const { notificationsApi } = await import('./notifications.api');

describe('Phase 4 API clients', () => {
  beforeEach(() => {
    Object.values(apiMock).forEach((mock) => mock.mockReset());
  });

  it('cleans blank opportunity filters while keeping pagination', () => {
    opportunitiesApi.list({ q: '', type: '', page: 1, limit: 12, sport: 'Athletics' });

    expect(apiMock.get).toHaveBeenCalledWith('/opportunities', {
      params: { page: 1, limit: 12, sport: 'Athletics' },
    });
  });

  it('encodes ids for opportunity and application actions', () => {
    opportunitiesApi.apply('opp/1', { documents: [] });
    applicationsApi.withdraw('app/1');
    notificationsApi.markRead('note/1');

    expect(apiMock.post).toHaveBeenCalledWith('/opportunities/opp%2F1/apply', {
      documents: [],
    });
    expect(apiMock.post).toHaveBeenCalledWith('/applications/app%2F1/withdraw');
    expect(apiMock.patch).toHaveBeenCalledWith('/notifications/note%2F1/read');
  });

  it('uploads application documents as multipart form data', () => {
    const file = new File(['%PDF-1.4'], 'medical.pdf', { type: 'application/pdf' });
    applicationsApi.uploadDocument(file);

    const [url, body] = apiMock.post.mock.calls[0];
    expect(url).toBe('/applications/documents');
    expect(body).toBeInstanceOf(FormData);
    expect(body.get('document')).toBe(file);
  });
});
