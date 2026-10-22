import { Link } from 'react-router-dom';
import StatusPanel from '../components/StatusPanel';
import { buttonClasses } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function Unauthorized() {
  useDocumentTitle('Access denied');
  const { user } = useAuth();

  return (
    <StatusPanel
      code="403 — Access denied"
      title="This area is for a different role"
      description="Your account is active, but your current role does not have permission to open this page. Role and ownership checks are enforced on the server."
      actions={
        <div className="flex flex-col gap-2">
          <Link
            to={user ? '/dashboard' : '/login'}
            className={buttonClasses({ size: 'lg', fullWidth: true })}
          >
            {user ? 'Back to your workspace' : 'Sign in'}
          </Link>
          <Link
            to="/"
            className={buttonClasses({ variant: 'ghost', size: 'md', fullWidth: true })}
          >
            Return to homepage
          </Link>
        </div>
      }
    />
  );
}
