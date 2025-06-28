/**
 * Axios設定とインターセプター
 * Silent refresh機能を含むJWT認証の自動処理
 */

import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '@/lib/api-config';
import { refreshToken, getAccessToken, logout } from '@/utils/auth';

// リフレッシュ処理中かどうかのフラグ
let isRefreshing = false;
// リフレッシュ待ちのリクエストキュー
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (error?: any) => void;
}> = [];

// キューを処理する関数
const processQueue = (error: any = null, token: string | null = null) => {
  failedQueue.forEach(promise => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

// Axiosインスタンスの作成
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true, // Cookie送信を有効化
  headers: {
    'Content-Type': 'application/json',
  },
});

// リクエストインターセプター
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // CSRFトークンをヘッダーに追加
    if (typeof window !== 'undefined') {
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('XSRF-TOKEN='))
        ?.split('=')[1];
      
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
      }

      // 従来のLocalStorageトークン（後方互換性）
      const token = getAccessToken();
      if (token && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// レスポンスインターセプター（Silent Refresh実装）
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // 401エラーかつリトライではない場合
    if (error.response?.status === 401 && !originalRequest._retry) {
      // 既にリフレッシュ中の場合はキューに追加
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => {
          // リフレッシュが成功したら元のリクエストを再実行
          return apiClient(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // リフレッシュトークンで新しいアクセストークンを取得
        const success = await refreshToken();
        
        if (success) {
          // キューのリクエストを処理
          processQueue(null, getAccessToken());
          isRefreshing = false;
          
          // 元のリクエストを再実行
          return apiClient(originalRequest);
        } else {
          // リフレッシュ失敗
          processQueue(error, null);
          isRefreshing = false;
          logout();
          return Promise.reject(error);
        }
      } catch (refreshError) {
        // リフレッシュエラー
        processQueue(refreshError, null);
        isRefreshing = false;
        logout();
        return Promise.reject(refreshError);
      }
    }

    // 403エラー（権限なし）の場合
    if (error.response?.status === 403) {
      console.error('Access forbidden:', error.response.data);
    }

    // その他のエラーはそのまま返す
    return Promise.reject(error);
  }
);

// 管理者用Axiosインスタンス
export const adminApiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 管理者用インターセプター（同様の実装）
adminApiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('XSRF-TOKEN='))
        ?.split('=')[1];
      
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
      }
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// ヘルパー関数
export const setAuthorizationHeader = (token: string) => {
  apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
};

export const removeAuthorizationHeader = () => {
  delete apiClient.defaults.headers.common['Authorization'];
};

// エクスポート
export default apiClient;