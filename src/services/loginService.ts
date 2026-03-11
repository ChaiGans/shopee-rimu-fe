// src/services/shopService.ts
import api from "../api/axios";
import { LoginResponse, LoginResponseData } from "@/types/LoginResponse";
import { LoginRequest } from "@/types/LoginRequest";

// Function to fetch users
export const loginShop = async (
  credentials: LoginRequest
): Promise<LoginResponseData> => {
  const response = await api.post<LoginResponse>("/api/auth/login", {
    username: credentials.username,
    password: credentials.password,
  });
  return response.data.data;
};
