import { ApiResponse } from "./ApiResponse";

export interface RegisterRequest {
  username: string;
  password: string;
  role: string;
}

interface RegisterResponseData {
  jwt_token: string;
}

export type RegisterResponse = ApiResponse<RegisterResponseData>;
