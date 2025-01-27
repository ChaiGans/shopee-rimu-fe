// src/services/selfService.ts

import api from "@/api/axios";
import { SelfResponse } from "@/types/SelfResponse";

// Function to self fetch authenticated user
export const getSelfInformation = async (): Promise<SelfResponse> => {
  const response = await api.get<SelfResponse>("/api/auth/self");
  return response.data;
};
