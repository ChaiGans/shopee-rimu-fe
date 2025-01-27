// src/services/selfService.ts

import api from "@/api/axios";
import { ApiResponse } from "@/types/ApiResponse";

// Function to self fetch authenticated user
export const logoutService = async (): Promise<ApiResponse<null>> => {
  const response = await api.post<ApiResponse<null>>("/api/auth/logout");
  return response.data;
};
