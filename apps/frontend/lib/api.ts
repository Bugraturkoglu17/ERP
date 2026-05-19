import axios from 'axios';

const API_PREFIX = '/api/v1';

const stripTrailingSlashes = (value: string) => value.replace(/\/+$/, '');

const createDefaultBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${API_PREFIX}`;
  }

  return process.env.NODE_ENV === 'production'
    ? API_PREFIX
    : `http://localhost:8000${API_PREFIX}`;
};

const createBaseUrl = () => {
  const rawBaseUrl = stripTrailingSlashes(process.env.NEXT_PUBLIC_API_URL || '');
  if (!rawBaseUrl) return createDefaultBaseUrl();
  return rawBaseUrl.endsWith(API_PREFIX) ? rawBaseUrl : `${rawBaseUrl}${API_PREFIX}`;
};

const normalizeRequestUrl = (url: string) => {
  if (/^https?:\/\//.test(url)) {
    return url;
  }

  const normalizedPath = url.startsWith('/') ? url : `/${url}`;
  return normalizedPath.startsWith(API_PREFIX)
    ? normalizedPath.slice(API_PREFIX.length) || '/'
    : normalizedPath;
};

export const buildApiUrl = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${createBaseUrl()}${normalizedPath}`;
};

export const api = axios.create({
  baseURL: createBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const apiGet = async <T>(url: string, params?: object) => {
  const response = await api.get<T>(normalizeRequestUrl(url), { params });
  if (response.data && !Array.isArray(response.data) && typeof response.data === 'object' && ('detail' in response.data || 'msg' in response.data)) {
    throw new Error("API returned an error object instead of data");
  }
  return response.data;
};

export const apiPost = async <T>(url: string, data?: any, isMultipart = false) => {
  const config = isMultipart 
    ? { headers: { 'Content-Type': 'multipart/form-data' } } 
    : undefined;
  const response = await api.post<T>(normalizeRequestUrl(url), data, config);
  return response.data;
};

export const apiPatch = async <T>(url: string, data?: object) => {
  const response = await api.patch<T>(normalizeRequestUrl(url), data);
  return response.data;
};

export const apiPut = async <T>(url: string, data?: object) => {
  const response = await api.put<T>(normalizeRequestUrl(url), data);
  return response.data;
};

export const apiDelete = async (url: string) => {
  const response = await api.delete(normalizeRequestUrl(url));
  return response.data;
};
