// src/types/Shop.ts
export interface LoginResponse {
  payload?: LoginResponseData;
  message: string;
}

export interface LoginResponseData {
  jwt_token: string;
}
