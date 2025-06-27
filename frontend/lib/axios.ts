import axios from 'axios';
import Cookies from 'js-cookie';

const raw = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1';
const baseURL = '/' + raw.replace(/^\/?/, '').replace(/\/$/, '');

const api = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 30000,
});

// CSRFトークンを自動的にヘッダーに追加
api.interceptors.request.use(config => {
  const token = Cookies.get('XSRF-TOKEN');
  
  // POST, PUT, PATCH, DELETEリクエストにのみCSRFトークンを追加
  if (token && ['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase() || '')) {
    config.headers['X-CSRF-Token'] = token;
  }
  
  return config;
}, error => {
  return Promise.reject(error);
});

export default api;