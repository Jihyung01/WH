import axios from 'axios';
import { API_CONFIG, getApiUrl } from '../config/api';
import { useAuthStore } from '../stores/authStore';

const api = axios.create({
  baseURL: `${API_CONFIG.BASE_URL}${API_CONFIG.API_VERSION}`,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach auth token from Supabase session
api.interceptors.request.use(async (config) => {
  const { session } = useAuthStore.getState();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

// Response interceptor — handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await useAuthStore.getState().signOut();
    }
    return Promise.reject(error);
  }
);

export default api;
