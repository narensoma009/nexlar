import { api } from "./client";

export type Role = "ae" | "manager";

export type User = {
  email: string;
  name: string;
  role: Role;
};

export type LoginResponse = { token: string; user: User };

export const login = (email: string, password: string) =>
  api<LoginResponse>("/api/auth/login", {
    method: "POST",
    json: { email, password },
  });

export const me = () => api<User>("/api/auth/me");
