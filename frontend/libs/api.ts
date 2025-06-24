import axios, { AxiosInstance, AxiosError } from 'axios';

// API Version from environment variable
const API_VERSION = process.env.NEXT_PUBLIC_API_VERSION || 'v1';

// APIクライアントの作成
export const api: AxiosInstance = axios.create({
  baseURL: `/api/${API_VERSION}`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Cookie認証のため
});

// デバッグ用
console.log(`🔗 API Client initialized with base URL: /api/${API_VERSION}`);

// リクエストインターセプター
api.interceptors.request.use(
  (config) => {
    // デバッグログ
    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// レスポンスインターセプター
api.interceptors.response.use(
  (response) => {
    // デバッグログ
    console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    return response;
  },
  (error: AxiosError) => {
    // エラーログ
    console.error(
      `[API Error] ${error.config?.method?.toUpperCase()} ${error.config?.url} - ${error.response?.status || 'Network Error'}`,
      error.response?.data || error.message
    );

    // 認証エラーの場合、ログインページにリダイレクト
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      // ログインページ以外からの401エラーの場合のみリダイレクト
      if (!currentPath.includes('/login') && !currentPath.includes('/register')) {
        window.location.href = '/ja/login';
      }
    }

    return Promise.reject(error);
  }
);

// 便利なヘルパー関数
export const apiHelpers = {
  // GETリクエスト
  get: <T = any>(url: string, params?: any) => 
    api.get<T>(url, { params }).then(res => res.data),
  
  // POSTリクエスト
  post: <T = any>(url: string, data?: any) => 
    api.post<T>(url, data).then(res => res.data),
  
  // PUTリクエスト
  put: <T = any>(url: string, data?: any) => 
    api.put<T>(url, data).then(res => res.data),
  
  // DELETEリクエスト
  delete: <T = any>(url: string) => 
    api.delete<T>(url).then(res => res.data),
  
  // PATCHリクエスト
  patch: <T = any>(url: string, data?: any) => 
    api.patch<T>(url, data).then(res => res.data),
};

export default api;