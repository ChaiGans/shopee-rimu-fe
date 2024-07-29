export interface RefreshResponse {
  data?: RefreshResponseData;
  message: string;
  statusCode?: number;
}

interface RefreshResponseData {
  access_token: string;
  expire_in: number;
}
