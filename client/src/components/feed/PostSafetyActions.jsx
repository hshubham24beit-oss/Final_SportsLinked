import { useState } from 'react';
import { FiFlag, FiMoreHorizontal, FiSlash } from 'react-icons/fi';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Select from '../ui/Select';
import Textarea from '../ui/Textarea';
import { blocksApi } from '../../api/blocks.api';
import { reportsApi } from '../../api/reports.api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/apiError';
import { REPORT_REASON_OPTIONS } from '../../utils/verification';

export default function PostSafetyActions({ post, onBlocked }) {
  const { user } = useAuth();
  const toast = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mode, setMode] = useState(null);
  const [reason, setReason] = useState('spam');
  const [details, setDetails] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!user || user.role === 'admin' || post.canDelete) {
    return null;
  }

  const close = () => {
    setMode(null);
    setError('');
  };

  const openMode = (nextMode) => {
    setMenuOpen(false);
    setMode(nextMode);
  };

  const submitReport = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await reportsApi.create({
        targetType: 'post',
        targetId: post.id,
        reason,
        details: details.trim(),
      });
      toast.success('Post reported', 'Our moderation team will review it.');
      setDetails('');
      close();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitBlock = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await blocksApi.block(post.author.id, blockReason.trim());
      toast.success('Account blocked', `${post.author.name} is now hidden from your feed.`);
      close();
      onBlocked?.(post.author.id);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  };

  const reportFormId = `post-report-${post.id}`;
  const blockFormId = `post-block-${post.id}`;

  return (
    <>
      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((current) => !current)}
          className="rounded-tile p-2 text-slate transition-colors hover:bg-sand hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-track"
          aria-label="Post actions"
          aria-expanded={menuOpen}
        >
          <FiMoreHorizontal className="h-5 w-5" aria-hidden="true" />
        </button>
        {menuOpen ? (
          <div className="absolute right-0 top-full z-10 mt-1 w-48 overflow-hidden rounded-tile border border-line bg-white py-1 shadow-lift">
            <button
              type="button"
              onClick={() => openMode('report')}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-body transition-colors hover:bg-sand/60 hover:text-navy"
            >
              <FiFlag className="h-4 w-4" aria-hidden="true" />
              Report post
            </button>
            <button
              type="button"
              onClick={() => openMode('block')}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-danger-700 transition-colors hover:bg-danger-50"
            >
              <FiSlash className="h-4 w-4" aria-hidden="true" />
              Block {post.author.name}
            </button>
          </div>
        ) : null}
      </div>

      <Modal
        open={mode === 'report'}
        onClose={close}
        title="Report this post"
        description="Reports are private. The author is not told who reported the post."
        footer={
          <>
            <Button variant="secondary" onClick={close} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              form={reportFormId}
              isLoading={isSubmitting}
              variant="danger"
            >
              Submit report
            </Button>
          </>
        }
      >
        <form id={reportFormId} onSubmit={submitReport} className="space-y-4">
          {error ? (
            <p className="rounded-tile border border-red-200 bg-danger-50 p-3 text-sm text-danger-700" role="alert">
              {error}
            </p>
          ) : null}
          <Select
            label="Reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            options={REPORT_REASON_OPTIONS}
            required
          />
          <Textarea
            label="What is wrong with this post?"
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="Add context for the moderation team."
          />
        </form>
      </Modal>

      <Modal
        open={mode === 'block'}
        onClose={close}
        title={`Block ${post.author.name}?`}
        description="Their posts will disappear from your feed, and neither of you can connect, follow, or interact."
        footer={
          <>
            <Button variant="secondary" onClick={close} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              form={blockFormId}
              isLoading={isSubmitting}
              variant="danger"
            >
              Block account
            </Button>
          </>
        }
      >
        <form id={blockFormId} onSubmit={submitBlock} className="space-y-4">
          {error ? (
            <p className="rounded-tile border border-red-200 bg-danger-50 p-3 text-sm text-danger-700" role="alert">
              {error}
            </p>
          ) : null}
          <Textarea
            label="Private reason"
            value={blockReason}
            onChange={(event) => setBlockReason(event.target.value)}
            rows={3}
            maxLength={500}
            hint="Optional. Only you can see this note."
          />
        </form>
      </Modal>
    </>
  );
}
