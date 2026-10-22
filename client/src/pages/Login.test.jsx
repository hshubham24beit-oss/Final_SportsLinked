import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Login from './Login';

const authMocks = vi.hoisted(() => ({ login: vi.fn() }));

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ login: authMocks.login }),
}));

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<div>Dashboard destination</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Login form', () => {
  beforeEach(() => {
    authMocks.login.mockReset();
  });

  it('shows validation messages instead of submitting an empty form', () => {
    renderLogin();

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(screen.getByText('Email is required.')).toBeInTheDocument();
    expect(screen.getByText('Password is required.')).toBeInTheDocument();
    expect(authMocks.login).not.toHaveBeenCalled();
  });

  it('submits trimmed credentials and navigates to the dashboard', async () => {
    authMocks.login.mockResolvedValueOnce({ role: 'athlete' });
    renderLogin();

    fireEvent.change(screen.getByLabelText(/Email address/), {
      target: { value: '  athlete@example.com  ' },
    });
    fireEvent.change(screen.getByLabelText(/^Password/), {
      target: { value: 'StrongPass1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(authMocks.login).toHaveBeenCalledWith({
        email: 'athlete@example.com',
        password: 'StrongPass1',
      });
    });
    expect(await screen.findByText('Dashboard destination')).toBeInTheDocument();
  });

  it('displays the API error when sign in fails', async () => {
    authMocks.login.mockRejectedValueOnce({
      response: { data: { message: 'Invalid email or password.' } },
    });
    renderLogin();

    fireEvent.change(screen.getByLabelText(/Email address/), {
      target: { value: 'athlete@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^Password/), {
      target: { value: 'WrongPass1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Invalid email or password.')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard destination')).not.toBeInTheDocument();
  });
});
