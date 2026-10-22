import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Register from './Register';

const authMocks = vi.hoisted(() => ({ register: vi.fn() }));

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ register: authMocks.register }),
}));

function renderRegister(path = '/register') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/register" element={<Register />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Register form', () => {
  beforeEach(() => {
    authMocks.register.mockReset();
  });

  it('applies a valid requested role from the URL', () => {
    renderRegister('/register?role=coach');

    expect(screen.getByRole('radio', { name: /coach/i })).toBeChecked();
    expect(screen.getByText(/Discover athletes, follow progress/i)).toBeInTheDocument();
  });

  it('validates required fields and password confirmation', () => {
    renderRegister();

    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(screen.getByText('Name is required.')).toBeInTheDocument();
    expect(screen.getByText('Email is required.')).toBeInTheDocument();
    expect(screen.getByText('Password is required.')).toBeInTheDocument();
    expect(screen.getByText('Confirm your password.')).toBeInTheDocument();
    expect(authMocks.register).not.toHaveBeenCalled();
  });

  it('submits the selected role and shows the verification state', async () => {
    authMocks.register.mockResolvedValueOnce({ emailSent: true });
    renderRegister('/register?role=coach');

    fireEvent.change(screen.getByLabelText(/Full name/), {
      target: { value: '  Sam Coach  ' },
    });
    fireEvent.change(screen.getByLabelText(/Email address/), {
      target: { value: '  coach@example.com  ' },
    });
    fireEvent.change(screen.getByLabelText(/^Password/), {
      target: { value: 'StrongPass1' },
    });
    fireEvent.change(screen.getByLabelText(/^Confirm password/), {
      target: { value: 'StrongPass1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => {
      expect(authMocks.register).toHaveBeenCalledWith({
        name: 'Sam Coach',
        email: 'coach@example.com',
        password: 'StrongPass1',
        role: 'coach',
      });
    });
    expect(await screen.findByText('Check your inbox')).toBeInTheDocument();
    expect(screen.getByText('coach@example.com')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to sign in' })).toBeInTheDocument();
  });
});
