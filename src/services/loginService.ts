// src/services/shopService.ts
import api from "../api/axios";
import { LoginResponseData } from "@/types/LoginResponse";
import { LoginRequest } from "@/types/LoginRequest";

// Function to fetch users
export const loginShop = async (
  credentials: LoginRequest
): Promise<LoginResponseData> => {
  const response = await api.post<LoginResponseData>("/api/auth/login", {
    username: credentials.username,
    password: credentials.password,
  });
  return response.data;
};
