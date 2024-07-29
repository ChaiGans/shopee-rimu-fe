import api from "@/api/axios";
import { RefreshResponse } from "@/types/refreshResponse";

// Function to fetch users
export const refreshToken = async (): Promise<RefreshResponse> => {
  const response = await api.post<RefreshResponse>("/api/auth/refresh-token");
  return response.data;
};
