// src/services/shopService.ts
import api from "../api/axios";
import { LoginResponse } from "@/types/LoginResponse";
import { LoginRequest } from "@/types/LoginRequest";

// Function to fetch users
export const loginShop = async (
  credentials: LoginRequest
): Promise<LoginResponse> => {
  const response = await api.post<LoginResponse>("/api/auth/login", {
    shop_id: credentials.shop_id,
    shop_code: credentials.shop_code,
  });
  return response.data;
};
