import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { safeRedirect } from '../utils/redirect';
import PageLoader from '../components/PageLoader';

export default function GuestRoute({ children }) {
  const { user, initializing } = useAuth();
  const location = useLocation();

  if (initializing) {
    return <PageLoader />;
  }

  if (user) {
    const params = new URLSearchParams(location.search);
    return <Navigate to={safeRedirect(params.get('redirect'), '/dashboard')} replace />;
  }

  return children;
}
