import axios, { type AxiosError } from "axios";

export interface ApiErrorResponse {
  message: string;
  code: string;
  errors?: Record<string, string[]>;
}

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 10_000,
});

// 요청마다 JWT 토큰 자동 첨부 + ngrok 브라우저 경고 우회
apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("oms-auth-token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  config.headers["ngrok-skip-browser-warning"] = "true";
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    const status = error.response?.status;

    if (status === 401) {
      const url = error.config?.url ?? "";
      const isAuthEndpoint =
        url.includes("/api/auth/login") || url.includes("/api/auth/signup");
      if (!isAuthEndpoint && typeof window !== "undefined") {
        localStorage.removeItem("oms-auth-token");
        document.cookie = "oms-auth-token=; path=/; max-age=0";
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  },
);
