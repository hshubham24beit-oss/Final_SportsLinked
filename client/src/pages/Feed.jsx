import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiEdit3, FiRefreshCw, FiRss, FiUserPlus } from 'react-icons/fi';
import Alert from '../components/ui/Alert';
import Button, { buttonClasses } from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import PostCard from '../components/feed/PostCard';
import { postsApi } from '../api/posts.api';
import { useAuth } from '../context/AuthContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { getErrorMessage } from '../utils/apiError';

const PAGE_SIZE = 10;

function mergePosts(current, incoming) {
  const seen = new Set(current.map((post) => post.id));
  return [...current, ...incoming.filter((post) => !seen.has(post.id))];
}

export default function Feed() {
  useDocumentTitle('Feed');
  const { user } = useAuth();
  const sentinelRef = useRef(null);
  const loadingRef = useRef(false);
  const [posts, setPosts] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (nextCursor = null, replace = false) => {
    if (loadingRef.current) {
      return;
    }
    loadingRef.current = true;
    setIsLoading(true);
    setError('');
    try {
      const response = await postsApi.feed(nextCursor, PAGE_SIZE);
      const incoming = response.data.data.posts || [];
      setPosts((current) => (replace ? incoming : mergePosts(current, incoming)));
      setCursor(response.data.meta?.nextCursor || null);
      setHasMore(Boolean(response.data.meta?.hasMore));
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
      setIsInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    load(null, true);
  }, [load]);

  const loadMore = useCallback(() => {
    if (!hasMore || !cursor || loadingRef.current) {
      return;
    }
    load(cursor);
  }, [cursor, hasMore, load]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore || !cursor) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadMore();
        }
      },
      { rootMargin: '240px 0px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [cursor, hasMore, loadMore]);

  const updatePost = (postId, patch) => {
    setPosts((current) =>
      current.map((post) => (post.id === postId ? { ...post, ...patch } : post)),
    );
  };

  const removePost = (postId) => {
    setPosts((current) => current.filter((post) => post.id !== postId));
  };

  const blockAuthor = (authorId) => {
    setPosts((current) => current.filter((post) => post.author?.id !== authorId));
  };

  const addSharedPost = (post) => {
    if (post) {
      setPosts((current) => {
        const withoutDuplicate = current.filter((entry) => entry.id !== post.id);
        return [post, ...withoutDuplicate];
      });
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Your network</p>
          <h1 className="mt-2 text-3xl leading-tight sm:text-4xl">
            The <span className="display-emphasis">feed.</span>
          </h1>
          <p className="mt-1.5 text-sm text-body">
            Updates, achievements, and opportunities from your sporting network.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {user?.role !== 'admin' ? (
            <Link
              to="/posts/new"
              className={buttonClasses({ size: 'sm' })}
            >
              <FiEdit3 className="h-4 w-4" aria-hidden="true" />
              Create post
            </Link>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => load(null, true)}
            isLoading={isLoading && posts.length === 0}
            leftIcon={<FiRefreshCw className="h-4 w-4" aria-hidden="true" />}
          >
            Refresh
          </Button>
          {user?.role !== 'admin' ? (
            <Link
              to="/network"
              className={buttonClasses({ variant: 'secondary', size: 'sm' })}
            >
              <FiUserPlus className="h-4 w-4" aria-hidden="true" />
              My network
            </Link>
          ) : null}
        </div>
      </div>

      {error ? (
        <Alert variant="error" title="The feed could not be loaded" className="mt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>{error}</span>
            <Button variant="secondary" size="sm" onClick={() => load(null, true)}>
              Try again
            </Button>
          </div>
        </Alert>
      ) : null}

      {isInitialLoading ? (
        <div className="mt-5 space-y-3" aria-label="Loading feed">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="animate-pulse rounded-card border border-line bg-white p-5 shadow-card"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-line" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/3 rounded bg-line" />
                  <div className="h-2.5 w-1/4 rounded bg-sand" />
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <div className="h-3 w-full rounded bg-sand" />
                <div className="h-3 w-4/5 rounded bg-sand" />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {!isInitialLoading && !error && posts.length === 0 ? (
        <EmptyState
          className="mt-5"
          icon={FiRss}
          title="Your feed is quiet"
          description="Connect with athletes, coaches, and recruiters, or follow people to see their updates here."
          action={
            user?.role === 'admin' ? null : (
              <Link to="/network" className={buttonClasses({ size: 'sm' })}>
                Find people to follow
              </Link>
            )
          }
        />
      ) : null}

      <div className="mt-5 space-y-4">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onUpdate={(patch) => updatePost(post.id, patch)}
            onRemove={removePost}
            onShared={addSharedPost}
            onBlocked={blockAuthor}
          />
        ))}
      </div>

      {posts.length > 0 && hasMore ? (
        <div ref={sentinelRef} className="mt-5 flex justify-center pb-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={loadMore}
            isLoading={isLoading}
          >
            {isLoading ? 'Loading more...' : 'Load more posts'}
          </Button>
        </div>
      ) : null}

      {!isInitialLoading && posts.length > 0 && !hasMore ? (
        <p className="mt-6 text-center text-xs text-slate">
          You are all caught up.
        </p>
      ) : null}
    </div>
  );
}
