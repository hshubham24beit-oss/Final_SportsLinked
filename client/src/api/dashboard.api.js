import api from './client';

export const dashboardApi = {
  get() {
    return api.get('/dashboard');
  },
};
