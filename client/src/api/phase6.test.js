import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('./client', () => ({ default: apiMock }));

const { postsApi } = await import('./posts.api');
const { connectionsApi } = await import('./connections.api');
const { followsApi } = await import('./follows.api');

describe('Phase 6 API clients', () => {
  beforeEach(() => {
    Object.values(apiMock).forEach((mock) => mock.mockReset());
  });

  it('loads feed pages with cursor pagination', () => {
    postsApi.feed();
    postsApi.feed('cursor/with+symbols', 20);

    expect(apiMock.get).toHaveBeenNthCalledWith(1, '/feed', {
      params: { limit: 10 },
    });
    expect(apiMock.get).toHaveBeenNthCalledWith(2, '/feed', {
      params: { limit: 20, cursor: 'cursor/with+symbols' },
    });
  });

  it('uploads post media as multipart data', () => {
    const file = new File(['image-bytes'], 'post.png', { type: 'image/png' });
    postsApi.uploadMedia(file);

    const [url, body] = apiMock.post.mock.calls[0];
    expect(url).toBe('/posts/media');
    expect(body).toBeInstanceOf(FormData);
    expect(body.get('image')).toBe(file);
  });

  it('encodes post, connection, follow, and comment identifiers', () => {
    postsApi.get('post/1');
    postsApi.like('post/1');
    postsApi.unlike('post/1');
    postsApi.addComment('post/1', 'Nice result');
    postsApi.deleteComment('post/1', 'comment/2');
    postsApi.share('post/1', 'Worth reading');
    connectionsApi.accept('connection/1');
    connectionsApi.remove('connection/1');
    followsApi.follow('user/1');
    followsApi.unfollow('user/1');

    expect(apiMock.get).toHaveBeenCalledWith('/posts/post%2F1');
    expect(apiMock.post).toHaveBeenCalledWith('/posts/post%2F1/like');
    expect(apiMock.delete).toHaveBeenCalledWith('/posts/post%2F1/like');
    expect(apiMock.post).toHaveBeenCalledWith('/posts/post%2F1/comments', {
      text: 'Nice result',
    });
    expect(apiMock.delete).toHaveBeenCalledWith(
      '/posts/post%2F1/comments/comment%2F2',
    );
    expect(apiMock.post).toHaveBeenCalledWith('/posts/post%2F1/share', {
      text: 'Worth reading',
    });
    expect(apiMock.post).toHaveBeenCalledWith(
      '/connections/connection%2F1/accept',
    );
    expect(apiMock.delete).toHaveBeenCalledWith(
      '/connections/connection%2F1',
    );
    expect(apiMock.post).toHaveBeenCalledWith('/follows/user%2F1');
    expect(apiMock.delete).toHaveBeenCalledWith('/follows/user%2F1');
  });

  it('passes network filters and suggestions limits', () => {
    connectionsApi.list({ page: 2, limit: 25 });
    connectionsApi.requests('outgoing');
    connectionsApi.suggestions(12);
    connectionsApi.mutual('user/1');
    followsApi.followers('user/1', { limit: 100 });
    followsApi.following('user/1', { limit: 100 });

    expect(apiMock.get).toHaveBeenCalledWith('/connections', {
      params: { page: 2, limit: 25 },
    });
    expect(apiMock.get).toHaveBeenCalledWith('/connections/requests', {
      params: { direction: 'outgoing' },
    });
    expect(apiMock.get).toHaveBeenCalledWith('/connections/suggestions', {
      params: { limit: 12 },
    });
    expect(apiMock.get).toHaveBeenCalledWith('/connections/mutual/user%2F1');
    expect(apiMock.get).toHaveBeenCalledWith('/follows/followers/user%2F1', {
      params: { limit: 100 },
    });
    expect(apiMock.get).toHaveBeenCalledWith('/follows/following/user%2F1', {
      params: { limit: 100 },
    });
  });
});
