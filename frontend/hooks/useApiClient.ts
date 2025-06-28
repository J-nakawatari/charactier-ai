/**
 * APIクライアントのReact Hook
 * axiosインスタンスをReactコンポーネントで使いやすくするラッパー
 */

import { useCallback } from 'react';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { apiClient, adminApiClient } from '@/lib/axios-config';
import { toast } from 'react-hot-toast';

interface ApiClientOptions {
  showError?: boolean;
  showSuccess?: boolean;
  successMessage?: string;
}

export function useApiClient() {

  // 一般APIリクエスト
  const request = useCallback(async <T = any>(
    config: AxiosRequestConfig,
    options: ApiClientOptions = { showError: true }
  ): Promise<AxiosResponse<T>> => {
    try {
      const response = await apiClient.request<T>(config);
      
      if (options.showSuccess && options.successMessage) {
        toast.success(options.successMessage);
      }
      
      return response;
    } catch (error: any) {
      if (options.showError) {
        const message = error.response?.data?.message || 'エラーが発生しました';
        toast.error(message);
      }
      throw error;
    }
  }, [toast]);

  // GET リクエスト
  const get = useCallback(<T = any>(
    url: string,
    config?: AxiosRequestConfig,
    options?: ApiClientOptions
  ) => {
    return request<T>({ ...config, method: 'GET', url }, options);
  }, [request]);

  // POST リクエスト
  const post = useCallback(<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
    options?: ApiClientOptions
  ) => {
    return request<T>({ ...config, method: 'POST', url, data }, options);
  }, [request]);

  // PUT リクエスト
  const put = useCallback(<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
    options?: ApiClientOptions
  ) => {
    return request<T>({ ...config, method: 'PUT', url, data }, options);
  }, [request]);

  // DELETE リクエスト
  const del = useCallback(<T = any>(
    url: string,
    config?: AxiosRequestConfig,
    options?: ApiClientOptions
  ) => {
    return request<T>({ ...config, method: 'DELETE', url }, options);
  }, [request]);

  return {
    request,
    get,
    post,
    put,
    delete: del,
    client: apiClient,
  };
}

// 管理者用APIクライアント
export function useAdminApiClient() {

  const request = useCallback(async <T = any>(
    config: AxiosRequestConfig,
    options: ApiClientOptions = { showError: true }
  ): Promise<AxiosResponse<T>> => {
    try {
      const response = await adminApiClient.request<T>(config);
      
      if (options.showSuccess && options.successMessage) {
        toast.success(options.successMessage);
      }
      
      return response;
    } catch (error: any) {
      if (options.showError) {
        const message = error.response?.data?.message || '管理者APIエラーが発生しました';
        toast.error(message);
      }
      
      // 401エラーの場合は管理者ログインページへ
      if (error.response?.status === 401) {
        window.location.href = '/admin/login';
      }
      
      throw error;
    }
  }, [toast]);

  const get = useCallback(<T = any>(
    url: string,
    config?: AxiosRequestConfig,
    options?: ApiClientOptions
  ) => {
    return request<T>({ ...config, method: 'GET', url }, options);
  }, [request]);

  const post = useCallback(<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
    options?: ApiClientOptions
  ) => {
    return request<T>({ ...config, method: 'POST', url, data }, options);
  }, [request]);

  const put = useCallback(<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
    options?: ApiClientOptions
  ) => {
    return request<T>({ ...config, method: 'PUT', url, data }, options);
  }, [request]);

  const del = useCallback(<T = any>(
    url: string,
    config?: AxiosRequestConfig,
    options?: ApiClientOptions
  ) => {
    return request<T>({ ...config, method: 'DELETE', url }, options);
  }, [request]);

  return {
    request,
    get,
    post,
    put,
    delete: del,
    client: adminApiClient,
  };
}