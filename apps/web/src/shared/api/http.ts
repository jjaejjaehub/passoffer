import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import { apiClient } from './axiosInstance';

export const http = {
  get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return apiClient
      .get<T, AxiosResponse<T>>(url, config)
      .then((response) => response.data);
  },

  post<T>(
    url: string,
    body: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    return apiClient
      .post<T, AxiosResponse<T>>(url, body, config)
      .then((response) => response.data);
  },

  put<T>(url: string, body: unknown, config?: AxiosRequestConfig): Promise<T> {
    return apiClient
      .put<T, AxiosResponse<T>>(url, body, config)
      .then((response) => response.data);
  },

  patch<T>(url: string, body: unknown, config?: AxiosRequestConfig): Promise<T> {
    return apiClient
      .patch<T, AxiosResponse<T>>(url, body, config)
      .then((response) => response.data);
  },

  delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return apiClient
      .delete<T, AxiosResponse<T>>(url, config)
      .then((response) => response.data);
  },
};


