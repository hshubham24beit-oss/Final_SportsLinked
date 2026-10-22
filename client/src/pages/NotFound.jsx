import { Link } from 'react-router-dom';
import StatusPanel from '../components/StatusPanel';
import { buttonClasses } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function NotFound() {
  useDocumentTitle('Page not found');
  const { user } = useAuth();

  return (
    <StatusPanel
      code="404 — Not found"
      title="We could not find that page"
      description="The address may be incorrect, or the page may have moved. Use the links below to get back on track."
      actions={
        <div className="flex flex-col gap-2">
          <Link
            to={user ? '/dashboard' : '/'}
            className={buttonClasses({ size: 'lg', fullWidth: true })}
          >
            {user ? 'Back to your workspace' : 'Return to homepage'}
          </Link>
          {!user ? (
            <Link
              to="/login"
              className={buttonClasses({ variant: 'ghost', size: 'md', fullWidth: true })}
            >
              Sign in
            </Link>
          ) : null}
        </div>
      }
    />
  );
}
