import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiFlag, FiSlash } from 'react-icons/fi';
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

export default function ProfileSafetyActions({ ownerId, ownerName, isOwner }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [mode, setMode] = useState(null);
  const [reason, setReason] = useState('spam');
  const [details, setDetails] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!user || user.role === 'admin' || isOwner || !ownerId) {
    return null;
  }

  const close = () => {
    setMode(null);
    setError('');
  };

  const submitReport = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await reportsApi.create({
        targetType: 'user',
        targetId: ownerId,
        reason,
        details: details.trim(),
      });
      toast.success('Report submitted', 'Our moderation team will review it.');
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
      await blocksApi.block(ownerId, blockReason.trim());
      toast.success('Account blocked', `${ownerName} is now hidden from your results.`);
      close();
      navigate('/dashboard');
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMode('report')}
          leftIcon={<FiFlag className="h-4 w-4" aria-hidden="true" />}
        >
          Report
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMode('block')}
          leftIcon={<FiSlash className="h-4 w-4" aria-hidden="true" />}
        >
          Block
        </Button>
      </div>

      <Modal
        open={mode === 'report'}
        onClose={close}
        title="Report this profile"
        description="Reports are private. The account owner is not told who reported them."
        footer={
          <>
            <Button variant="secondary" onClick={close} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="profile-report-form"
              isLoading={isSubmitting}
              variant="danger"
            >
              Submit report
            </Button>
          </>
        }
      >
        <form id="profile-report-form" onSubmit={submitReport} className="space-y-4">
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
            label="What happened?"
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="Add context that will help moderators review this report."
          />
        </form>
      </Modal>

      <Modal
        open={mode === 'block'}
        onClose={close}
        title={`Block ${ownerName}?`}
        description="You will no longer see each other's profiles or listings, and neither of you can apply to the other's opportunities."
        footer={
          <>
            <Button variant="secondary" onClick={close} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="profile-block-form"
              isLoading={isSubmitting}
              variant="danger"
            >
              Block account
            </Button>
          </>
        }
      >
        <form id="profile-block-form" onSubmit={submitBlock} className="space-y-4">
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
