import { ApiResponse } from "./ApiResponse";

// src/types/Shop.ts
export interface LoginResponseData {
  jwt_token: string;
}

export type LoginResponse = ApiResponse<LoginResponseData>;
