import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiGlobe,
  FiHeart,
  FiLock,
  FiMessageCircle,
  FiRepeat,
  FiShare2,
  FiTrash2,
  FiUsers,
} from 'react-icons/fi';
import Avatar from '../ui/Avatar';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Textarea from '../ui/Textarea';
import CommentSection from './CommentSection';
import PostSafetyActions from './PostSafetyActions';
import { postsApi } from '../../api/posts.api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/apiError';
import { formatRelativeTime } from '../../utils/format';
import { getRoleLabel } from '../../utils/roles';

const PRIORITY_LABELS = {
  own: 'Your post',
  connection: 'From your network',
  following: 'From someone you follow',
  sport: 'Shared sport',
};

function PostMedia({ media, authorName, compact = false }) {
  if (!media || media.length === 0) {
    return null;
  }

  return (
    <div
      className={`mt-3 grid gap-1.5 overflow-hidden rounded-lg ${
        media.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
      }`}
    >
      {media.map((image, index) => (
        <a
          key={image.id || image.url}
          href={image.url}
          target="_blank"
          rel="noreferrer"
          className={`group relative overflow-hidden bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 ${
            media.length === 1
              ? compact
                ? 'aspect-video'
                : 'aspect-[4/3]'
              : 'aspect-square'
          }`}
        >
          <img
            src={image.url}
            alt={`Post image ${index + 1} by ${authorName}`}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        </a>
      ))}
    </div>
  );
}

function SharedPostPreview({ sharedPost, authorName }) {
  if (!sharedPost) {
    return (
      <div className="mt-3 rounded-lg border border-dashed border-line-strong bg-slate-50 p-4 text-sm text-ink-subtle">
        The original post is no longer available.
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-line bg-slate-50/70 p-3.5">
      <div className="flex items-center gap-2.5">
        <Avatar
          name={sharedPost.author?.name}
          src={sharedPost.author?.avatarUrl}
          size="xs"
        />
        <div className="min-w-0">
          {sharedPost.author?.slug ? (
            <Link
              to={`/p/${sharedPost.author.slug}`}
              className="truncate text-xs font-semibold text-ink hover:text-brand-800"
            >
              {sharedPost.author.name}
            </Link>
          ) : (
            <span className="truncate text-xs font-semibold text-ink">
              {sharedPost.author?.name || authorName}
            </span>
          )}
          <p className="text-[11px] text-ink-subtle">
            {formatRelativeTime(sharedPost.createdAt)}
          </p>
        </div>
      </div>
      {sharedPost.text ? (
        <p className="mt-2 line-clamp-4 whitespace-pre-line text-sm leading-relaxed text-ink-muted">
          {sharedPost.text}
        </p>
      ) : null}
      <PostMedia
        media={sharedPost.media}
        authorName={sharedPost.author?.name || authorName}
        compact
      />
    </div>
  );
}

export default function PostCard({ post, onUpdate, onRemove, onShared, onBlocked }) {
  const { user } = useAuth();
  const toast = useToast();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareText, setShareText] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const author = post.author || {};
  const canInteract = Boolean(user && user.role !== 'admin');
  const canShare = canInteract && post.visibility === 'public';
  const priorityLabel = PRIORITY_LABELS[post.priorityReason];

  const toggleLike = async () => {
    if (!canInteract || isLiking) {
      return;
    }
    setIsLiking(true);
    try {
      const response = post.likedByMe
        ? await postsApi.unlike(post.id)
        : await postsApi.like(post.id);
      onUpdate?.({
        likedByMe: response.data.data.likedByMe,
        likeCount: response.data.data.likeCount,
      });
    } catch (requestError) {
      toast.error('Could not update like', getErrorMessage(requestError));
    } finally {
      setIsLiking(false);
    }
  };

  const updateCommentCount = (delta) => {
    onUpdate?.({ commentCount: Math.max(0, (post.commentCount || 0) + delta) });
  };

  const submitShare = async (event) => {
    event.preventDefault();
    setIsSharing(true);
    try {
      const response = await postsApi.share(post.id, shareText.trim());
      toast.success('Post shared', 'It is now visible in your followers’ feeds.');
      setShareOpen(false);
      setShareText('');
      onShared?.(response.data.data.post);
      onUpdate?.({ shareCount: (post.shareCount || 0) + 1 });
    } catch (requestError) {
      toast.error('Could not share post', getErrorMessage(requestError));
    } finally {
      setIsSharing(false);
    }
  };

  const deletePost = async () => {
    setIsDeleting(true);
    try {
      await postsApi.remove(post.id);
      toast.success('Post deleted');
      setDeleteOpen(false);
      onRemove?.(post.id);
    } catch (requestError) {
      toast.error('Could not delete post', getErrorMessage(requestError));
    } finally {
      setIsDeleting(false);
    }
  };

  const shareFormId = `share-post-${post.id}`;

  return (
    <article
      id={`post-${post.id}`}
      className="overflow-hidden rounded-xl border border-line bg-white shadow-card"
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <Link
            to={author.slug ? `/p/${author.slug}` : '/discovery'}
            className="shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
            aria-label={`View ${author.name || 'member'} profile`}
          >
            <Avatar name={author.name} src={author.avatarUrl} size="md" />
          </Link>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {author.slug ? (
                <Link
                  to={`/p/${author.slug}`}
                  className="truncate text-sm font-semibold text-ink hover:text-brand-800"
                >
                  {author.name || 'SportLinked member'}
                </Link>
              ) : (
                <span className="truncate text-sm font-semibold text-ink">
                  {author.name || 'SportLinked member'}
                </span>
              )}
              {author.role ? (
                <span className="text-[11px] font-medium text-ink-subtle">
                  {getRoleLabel(author.role)}
                </span>
              ) : null}
              {post.type === 'share' ? (
                <span className="text-[11px] text-ink-subtle">shared a post</span>
              ) : null}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-ink-subtle">
              <span>{formatRelativeTime(post.createdAt)}</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                {post.visibility === 'connections' ? (
                  <>
                    <FiUsers className="h-3 w-3" aria-hidden="true" />
                    Connections only
                  </>
                ) : (
                  <>
                    <FiGlobe className="h-3 w-3" aria-hidden="true" />
                    Public
                  </>
                )}
              </span>
              {post.sport ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{post.sport}</span>
                </>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {priorityLabel ? (
              <Badge variant="neutral" size="sm" className="hidden sm:inline-flex">
                {priorityLabel}
              </Badge>
            ) : null}
            <PostSafetyActions post={post} onBlocked={onBlocked} />
          </div>
        </div>

        {post.type === 'achievement' ? (
          <Badge variant="success" size="sm" className="mt-3">
            Achievement
          </Badge>
        ) : null}
        {post.type === 'opportunity' ? (
          <Badge variant="info" size="sm" className="mt-3">
            Opportunity
          </Badge>
        ) : null}

        {post.text ? (
          <p className="mt-3 whitespace-pre-line break-words text-sm leading-6 text-ink">
            {post.text}
          </p>
        ) : null}

        <PostMedia media={post.media} authorName={author.name} />
        {post.type === 'share' ? (
          <SharedPostPreview sharedPost={post.sharedPost} authorName={author.name} />
        ) : null}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggleLike}
              disabled={!canInteract || isLiking}
              aria-pressed={Boolean(post.likedByMe)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 disabled:opacity-60 ${
                post.likedByMe
                  ? 'text-danger-600 hover:bg-danger-50'
                  : 'text-ink-muted hover:bg-slate-100 hover:text-ink'
              }`}
            >
              <FiHeart
                className={`h-4 w-4 ${post.likedByMe ? 'fill-current' : ''}`}
                aria-hidden="true"
              />
              {post.likeCount || 0}
              <span className="sr-only">{post.likedByMe ? 'unlike' : 'like'}</span>
            </button>

            <button
              type="button"
              onClick={() => setCommentsOpen((current) => !current)}
              aria-expanded={commentsOpen}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:bg-slate-100 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
            >
              <FiMessageCircle className="h-4 w-4" aria-hidden="true" />
              {post.commentCount || 0}
              <span className="sr-only">comments</span>
            </button>

            {canShare ? (
              <button
                type="button"
                onClick={() => setShareOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:bg-slate-100 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
              >
                <FiRepeat className="h-4 w-4" aria-hidden="true" />
                {post.shareCount || 0}
                <span className="sr-only">shares</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-ink-subtle">
                <FiLock className="h-3.5 w-3.5" aria-hidden="true" />
                {post.shareCount || 0}
              </span>
            )}
          </div>

          {post.canDelete ? (
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink-subtle transition-colors hover:bg-danger-50 hover:text-danger-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
            >
              <FiTrash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Delete
            </button>
          ) : null}
        </div>
      </div>

      {commentsOpen ? (
        <CommentSection
          post={post}
          onCountChange={updateCommentCount}
          readOnly={!canInteract}
        />
      ) : null}

      <Modal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title="Share this post"
        description="Add a thought, or share it as it is with your network."
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setShareOpen(false)}
              disabled={isSharing}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form={shareFormId}
              isLoading={isSharing}
              leftIcon={<FiShare2 className="h-4 w-4" aria-hidden="true" />}
            >
              Share post
            </Button>
          </>
        }
      >
        <form id={shareFormId} onSubmit={submitShare}>
          <Textarea
            value={shareText}
            onChange={(event) => setShareText(event.target.value)}
            rows={4}
            maxLength={3000}
            placeholder="Why is this worth sharing?"
            aria-label="Add a comment to your share"
          />
        </form>
      </Modal>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete this post?"
        description="This cannot be undone. Comments and likes on the post will also be removed."
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setDeleteOpen(false)}
              disabled={isDeleting}
            >
              Keep post
            </Button>
            <Button
              variant="danger"
              onClick={deletePost}
              isLoading={isDeleting}
              leftIcon={<FiTrash2 className="h-4 w-4" aria-hidden="true" />}
            >
              Delete post
            </Button>
          </>
        }
      />
    </article>
  );
}
