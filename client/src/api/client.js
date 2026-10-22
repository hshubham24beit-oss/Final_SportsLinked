import axios from 'axios';

export const API_BASE_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'
).replace(/\/$/, '');

let accessToken = null;

export function setAccessToken(token) {
  accessToken = token || null;
}

export function getAccessToken() {
  return accessToken;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
  },
});

api.interceptors.request.use((requestConfig) => {
  if (accessToken) {
    requestConfig.headers.Authorization = `Bearer ${accessToken}`;
  }
  return requestConfig;
});

let refreshPromise = null;

export function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(
        `${API_BASE_URL}/auth/refresh`,
        {},
        {
          withCredentials: true,
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        },
      )
      .then((response) => {
        const payload = response.data && response.data.data;
        if (!payload || !payload.accessToken || !payload.user) {
          throw new Error('The session response was not valid.');
        }
        setAccessToken(payload.accessToken);
        return payload;
      })
      .catch((error) => {
        setAccessToken(null);
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response && error.response.status;

    if (
      status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      originalRequest.skipAuthRefresh
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const payload = await refreshSession();
      window.dispatchEvent(new CustomEvent('auth:refreshed', { detail: payload }));
      originalRequest.headers = {
        ...(originalRequest.headers || {}),
        Authorization: `Bearer ${payload.accessToken}`,
      };
      return api(originalRequest);
    } catch {
      window.dispatchEvent(new Event('auth:expired'));
      return Promise.reject(error);
    }
  },
);

export default api;
