// src/types/Shop.ts
export interface LoginResponse {
  data?: LoginResponseData;
  message: string;
  statusCode?: number;
}

interface LoginResponseData {
  access_token: string;
  expire_in: number;
  shop_id: number;
}
