import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
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
  const response = await api.get<T>(url, { params });
  if (response.data && !Array.isArray(response.data) && typeof response.data === 'object' && ('detail' in response.data || 'msg' in response.data)) {
    throw new Error("API returned an error object instead of data");
  }
  return response.data;
};

export const apiPost = async <T>(url: string, data?: any, isMultipart = false) => {
  const config = isMultipart 
    ? { headers: { 'Content-Type': 'multipart/form-data' } } 
    : undefined;
  const response = await api.post<T>(url, data, config);
  return response.data;
};

export const apiPatch = async <T>(url: string, data?: object) => {
  const response = await api.patch<T>(url, data);
  return response.data;
};

export const apiDelete = async (url: string) => {
  const response = await api.delete(url);
  return response.data;
};
