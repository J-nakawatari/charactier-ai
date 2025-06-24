import axios from 'axios';

const raw = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1';
const baseURL = '/' + raw.replace(/^\/?/, '').replace(/\/$/, '');

const api = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 30000,
});

export default api;