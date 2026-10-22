import api from './client';

const noRefresh = { skipAuthRefresh: true };

export const authApi = {
  register(payload) {
    return api.post('/auth/register', payload, noRefresh);
  },
  login(payload) {
    return api.post('/auth/login', payload, noRefresh);
  },
  logout() {
    return api.post('/auth/logout', {}, noRefresh);
  },
  verifyEmail(token) {
    return api.post('/auth/verify-email', { token }, noRefresh);
  },
  resendVerification() {
    return api.post('/auth/resend-verification', {});
  },
  forgotPassword(email) {
    return api.post('/auth/forgot-password', { email }, noRefresh);
  },
  resetPassword(payload) {
    return api.post('/auth/reset-password', payload, noRefresh);
  },
  me() {
    return api.get('/auth/me');
  },
  deactivate(password) {
    return api.post('/auth/deactivate', { password });
  },
  deleteAccount(password) {
    return api.delete('/auth/account', { data: { password } });
  },
};
