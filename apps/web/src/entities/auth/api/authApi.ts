import { apiClient } from "@/shared/api";

export interface AuthUser {
  id?: string;
  userId?: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export const authApi = {
  signup(data: {
    email: string;
    password: string;
    name: string;
  }): Promise<AuthResponse> {
    return apiClient
      .post<AuthResponse>("/api/auth/signup", data)
      .then((r) => r.data);
  },

  login(data: { email: string; password: string }): Promise<AuthResponse> {
    return apiClient
      .post<AuthResponse>("/api/auth/login", data)
      .then((r) => r.data);
  },

  me(): Promise<AuthUser> {
    return apiClient.get<AuthUser>("/api/auth/me").then((r) => r.data);
  },
};
