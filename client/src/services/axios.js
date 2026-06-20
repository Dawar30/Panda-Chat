import axios from 'axios';
import { clearAuthToken, getAuthToken } from './tokenStorage';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});

const publicPaths = ['/user/login', '/user/signup'];

api.interceptors.request.use((config) => {
  if (typeof window === 'undefined') {
    return config;
  }

  const token = getAuthToken();
  const requestUrl = config.url || '';
  const isPublicRequest = publicPaths.some((path) => requestUrl.includes(path));

  if (!token && !isPublicRequest) {
    if (window.location.pathname !== '/login') {
      window.location.assign('/login');
    }
    return Promise.reject(new Error('Authentication required'));
  }

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url || '';
    const isPublicRequest = publicPaths.some((path) => requestUrl.includes(path));

    if (error.response?.status === 401 && !isPublicRequest && typeof window !== 'undefined') {
      clearAuthToken();
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }

    return Promise.reject(error);
  }
);

export default api;