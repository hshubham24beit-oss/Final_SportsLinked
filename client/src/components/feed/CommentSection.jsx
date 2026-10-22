import { useCallback, useEffect, useState } from 'react';
import { FiCornerDownRight, FiSend, FiTrash2 } from 'react-icons/fi';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import Textarea from '../ui/Textarea';
import { postsApi } from '../../api/posts.api';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/apiError';
import { formatRelativeTime } from '../../utils/format';

export default function CommentSection({ post, onCountChange, readOnly = false }) {
  const toast = useToast();
  const [comments, setComments] = useState([]);
  const [meta, setMeta] = useState({ page: 1, total: 0, totalPages: 0 });
  const [page, setPage] = useState(1);
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await postsApi.comments(post.id, { page, limit: 20 });
      const nextComments = response.data.data.comments || [];
      setComments((current) =>
        page === 1 ? nextComments : [...current, ...nextComments],
      );
      setMeta(response.data.meta || { page, total: nextComments.length, totalPages: 1 });
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  }, [page, post.id]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (event) => {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      const response = await postsApi.addComment(post.id, trimmed);
      const comment = response.data.data.comment;
      setComments((current) => [...current, comment]);
      setMeta((current) => ({ ...current, total: current.total + 1 }));
      setText('');
      onCountChange?.(1);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  };

  const remove = async (comment) => {
    setDeletingId(comment.id);
    setError('');
    try {
      await postsApi.deleteComment(post.id, comment.id);
      setComments((current) => current.filter((entry) => entry.id !== comment.id));
      setMeta((current) => ({ ...current, total: Math.max(0, current.total - 1) }));
      onCountChange?.(-1);
    } catch (requestError) {
      toast.error('Could not delete comment', getErrorMessage(requestError));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="border-t border-line bg-slate-50/40 px-4 py-3 sm:px-5">
      {error ? (
        <p className="mb-3 rounded-lg border border-red-200 bg-danger-50 p-2.5 text-xs text-danger-700" role="alert">
          {error}
        </p>
      ) : null}

      {isLoading && page === 1 ? (
        <p className="py-2 text-xs text-ink-subtle">Loading comments...</p>
      ) : null}

      {!isLoading && comments.length === 0 ? (
        <p className="py-2 text-xs text-ink-subtle">
          No comments yet. Start the conversation.
        </p>
      ) : null}

      {comments.length > 0 ? (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div key={comment.id} className="flex items-start gap-2.5">
              <Avatar
                name={comment.author?.name}
                src={comment.author?.avatarUrl}
                size="xs"
              />
              <div className="min-w-0 flex-1 rounded-lg border border-line bg-white px-3 py-2">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <p className="text-xs font-semibold text-ink">
                    {comment.author?.name || 'Member'}
                  </p>
                  <span className="text-[11px] text-ink-subtle">
                    {formatRelativeTime(comment.createdAt)}
                  </span>
                </div>
                <p className="mt-0.5 whitespace-pre-line text-sm leading-relaxed text-ink-muted">
                  {comment.text}
                </p>
              </div>
              {comment.canDelete ? (
                <button
                  type="button"
                  onClick={() => remove(comment)}
                  disabled={deletingId === comment.id}
                  className="mt-1 rounded-md p-1.5 text-ink-subtle transition-colors hover:bg-danger-50 hover:text-danger-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 disabled:opacity-50"
                  aria-label="Delete comment"
                >
                  <FiTrash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {meta.totalPages > meta.page ? (
        <Button
          variant="link"
          size="sm"
          className="mt-3 !h-auto !px-0 !text-xs"
          onClick={() => setPage((current) => current + 1)}
          isLoading={isLoading}
        >
          Load more comments
        </Button>
      ) : null}

      {readOnly ? null : (
        <form onSubmit={submit} className="mt-3 flex items-start gap-2">
          <span className="mt-2.5 text-ink-subtle" aria-hidden="true">
            <FiCornerDownRight className="h-4 w-4" />
          </span>
          <Textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="Write a comment..."
            className="!py-2 !text-sm"
            aria-label="Write a comment"
          />
          <Button
            type="submit"
            size="sm"
            isLoading={isSubmitting}
            disabled={!text.trim()}
            leftIcon={<FiSend className="h-4 w-4" aria-hidden="true" />}
            className="mt-0.5"
          >
            Send
          </Button>
        </form>
      )}
    </div>
  );
}
