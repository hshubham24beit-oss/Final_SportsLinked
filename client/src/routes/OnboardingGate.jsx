import { Navigate, Outlet } from 'react-router-dom';
import PageLoader from '../components/PageLoader';
import { useAuth } from '../hooks/useAuth';

export default function OnboardingGate() {
  const { user, initializing } = useAuth();

  if (initializing) {
    return <PageLoader message="Checking your profile…" />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'admin' && !user.onboardingCompleted) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}
