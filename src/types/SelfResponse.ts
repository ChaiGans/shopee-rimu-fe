import { ApiResponse } from "./ApiResponse";

interface SelfResponseData {
  id: number;
  username: string;
  role: string;
}

export type SelfResponse = ApiResponse<SelfResponseData>;
