import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';

vi.mock('../api/client', () => ({
  refreshSession: vi.fn().mockResolvedValue({
    user: {
      id: 'user-1',
      name: 'Alex Runner',
      email: 'alex@example.com',
      role: 'athlete',
      onboardingCompleted: true,
    },
  }),
  setAccessToken: vi.fn(),
}));

vi.mock('../api/auth.api', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    me: vi.fn(),
  },
}));

function Probe() {
  const { user, updateUser } = useAuth();

  if (!user) return <p>Loading</p>;

  return (
    <div>
      <p data-testid="user-name">{user.name}</p>
      <p data-testid="user-email">{user.email}</p>
      <p data-testid="avatar-url">{user.avatarUrl || 'none'}</p>
      <button type="button" onClick={() => updateUser({ avatarUrl: 'https://example.com/a.jpg' })}>
        Update avatar
      </button>
    </div>
  );
}

describe('AuthContext', () => {
  it('merges partial user updates without dropping session details', async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    expect(await screen.findByTestId('user-name')).toHaveTextContent('Alex Runner');

    fireEvent.click(screen.getByRole('button', { name: 'Update avatar' }));

    expect(screen.getByTestId('avatar-url')).toHaveTextContent('https://example.com/a.jpg');
    expect(screen.getByTestId('user-name')).toHaveTextContent('Alex Runner');
    expect(screen.getByTestId('user-email')).toHaveTextContent('alex@example.com');
  });
});
