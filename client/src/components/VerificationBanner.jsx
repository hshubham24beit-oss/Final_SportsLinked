import { useState } from 'react';
import { FiMail } from 'react-icons/fi';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { authApi } from '../api/auth.api';
import { getErrorMessage } from '../utils/apiError';
import Button from './ui/Button';

export default function VerificationBanner() {
  const { user } = useAuth();
  const toast = useToast();
  const [isSending, setIsSending] = useState(false);

  if (!user || user.isEmailVerified) {
    return null;
  }

  const handleResend = async () => {
    setIsSending(true);
    try {
      await authApi.resendVerification();
      toast.success(
        'Verification email sent',
        `Check ${user.email} for a fresh verification link.`,
      );
    } catch (error) {
      toast.error('Could not resend the email', getErrorMessage(error));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-tile border border-pending/25 bg-pending-soft px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <FiMail className="mt-0.5 h-5 w-5 shrink-0 text-pending" aria-hidden="true" />
        <div>
          <p className="text-sm font-extrabold text-pending">Verify your email address</p>
          <p className="mt-0.5 text-sm leading-relaxed text-pending/90">
            We sent a link to <span className="font-extrabold">{user.email}</span>. Verified email is
            required for trusted actions on SportLinked.
          </p>
        </div>
      </div>
      <Button
        variant="secondary"
        size="sm"
        onClick={handleResend}
        isLoading={isSending}
        className="shrink-0 self-stretch border-pending/25 bg-white hover:bg-white/70 sm:self-auto"
      >
        Resend email
      </Button>
    </div>
  );
}
