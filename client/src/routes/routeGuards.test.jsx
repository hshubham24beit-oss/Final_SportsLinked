import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GuestRoute from './GuestRoute';
import OnboardingGate from './OnboardingGate';
import ProtectedRoute from './ProtectedRoute';
import RoleRoute from './RoleRoute';

const authState = vi.hoisted(() => ({
  value: { user: null, initializing: false },
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => authState.value,
}));

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}

function renderRoutes(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LocationDisplay />
      <Routes>
        <Route
          path="/login"
          element={
            <GuestRoute>
              <div>Login screen</div>
            </GuestRoute>
          }
        />
        <Route path="/unauthorized" element={<div>Unauthorized screen</div>} />
        <Route path="/onboarding" element={<div>Onboarding screen</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<div>Dashboard screen</div>} />
          <Route element={<OnboardingGate />}>
            <Route path="/workspace" element={<div>Workspace screen</div>} />
          </Route>
        </Route>
        <Route
          path="/settings"
          element={
            <RoleRoute allowedRoles={['athlete']}>
              <div>Settings screen</div>
            </RoleRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('route guards', () => {
  beforeEach(() => {
    authState.value = { user: null, initializing: false };
  });

  it('redirects guests away from protected routes and preserves the destination', () => {
    renderRoutes('/dashboard');

    expect(screen.getByText('Login screen')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/login?redirect=%2Fdashboard');
  });

  it('renders protected routes for authenticated users', () => {
    authState.value = { user: { role: 'athlete' }, initializing: false };
    renderRoutes('/dashboard');

    expect(screen.getByText('Dashboard screen')).toBeInTheDocument();
  });

  it('redirects authenticated users away from guest-only pages', () => {
    authState.value = { user: { role: 'athlete' }, initializing: false };
    renderRoutes('/login?redirect=%2Fdashboard');

    expect(screen.getByText('Dashboard screen')).toBeInTheDocument();
  });

  it('allows users with an accepted role through', () => {
    authState.value = { user: { role: 'athlete' }, initializing: false };
    renderRoutes('/settings');

    expect(screen.getByText('Settings screen')).toBeInTheDocument();
  });

  it('redirects users with a different role to unauthorized', () => {
    authState.value = { user: { role: 'coach' }, initializing: false };
    renderRoutes('/settings');

    expect(screen.getByText('Unauthorized screen')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/unauthorized');
  });

  it('redirects guests to login when a role is required', () => {
    renderRoutes('/settings');

    expect(screen.getByText('Login screen')).toBeInTheDocument();
  });

  it('redirects accounts with incomplete onboarding to profile setup', () => {
    authState.value = {
      user: { role: 'athlete', onboardingCompleted: false },
      initializing: false,
    };
    renderRoutes('/workspace');

    expect(screen.getByText('Onboarding screen')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/onboarding');
  });

  it('allows completed profiles and admins through the onboarding gate', () => {
    authState.value = {
      user: { role: 'coach', onboardingCompleted: true },
      initializing: false,
    };
    const { unmount } = renderRoutes('/workspace');

    expect(screen.getByText('Workspace screen')).toBeInTheDocument();
    unmount();

    authState.value = {
      user: { role: 'admin', onboardingCompleted: false },
      initializing: false,
    };
    renderRoutes('/workspace');

    expect(screen.getByText('Workspace screen')).toBeInTheDocument();
  });
});
