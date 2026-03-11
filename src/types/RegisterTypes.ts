import { ApiResponse } from "./ApiResponse";

export interface RegisterRequest {
  username: string;
  password: string;
  role: string;
}

export interface RegisterResponseData {
  jwt_token: string;
}

export type RegisterResponse = ApiResponse<RegisterResponseData>;
