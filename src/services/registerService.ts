// src/services/registerService.ts
import api from "../api/axios";
import { RegisterRequest, RegisterResponse } from "@/types/RegisterTypes";

// Function to fetch users
export const registerUser = async (
  credentials: RegisterRequest
): Promise<RegisterResponse> => {
  const response = await api.post<RegisterResponse>("/api/auth/register", {
    username: credentials.username,
    password: credentials.password,
    role: credentials.role,
  });
  return response.data;
};
