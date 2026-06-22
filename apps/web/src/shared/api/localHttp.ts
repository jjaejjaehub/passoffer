/**
 * Next.js 내부 API 라우트(/api/qoo10/...)용 axios 클라이언트.
 * baseURL 없이 상대 경로로 호출하므로 현재 오리진(localhost:3000)으로 요청됨.
 */
import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios";

const localClient = axios.create({
  timeout: 30_000,
});

export const localHttp = {
  get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return localClient
      .get<T, AxiosResponse<T>>(url, config)
      .then((r) => r.data);
  },

  post<T>(url: string, body: unknown, config?: AxiosRequestConfig): Promise<T> {
    return localClient
      .post<T, AxiosResponse<T>>(url, body, config)
      .then((r) => r.data);
  },

  put<T>(url: string, body: unknown, config?: AxiosRequestConfig): Promise<T> {
    return localClient
      .put<T, AxiosResponse<T>>(url, body, config)
      .then((r) => r.data);
  },

  delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return localClient
      .delete<T, AxiosResponse<T>>(url, config)
      .then((r) => r.data);
  },
};
