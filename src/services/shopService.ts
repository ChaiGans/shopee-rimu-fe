import api from "@/api/axios";
import { ApiResponse } from "@/types/ApiResponse";
import { Shop } from "@/types/Shop";

export const getShops = async (): Promise<Shop[]> => {
  const response = await api.get<ApiResponse<Shop[]>>("/api/shop/");
  return response.data.data;
};
