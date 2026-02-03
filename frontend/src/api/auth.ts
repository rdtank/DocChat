import { apiFetch } from "./client";

export interface AuthResponse {
  token: string;
  user: { id: string; email: string };
}

export const loginApi = (email: string, password: string) =>
  apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

export const signupApi = (email: string, password: string) =>
  apiFetch<AuthResponse>("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
