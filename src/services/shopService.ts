import api from "@/api/axios";
import { ApiResponse } from "@/types/ApiResponse";
import { Shop } from "@/types/Shop";

export const getShops = async (): Promise<Shop[]> => {
  const response = await api.get<ApiResponse<Shop[]>>("/api/shop/");
  return response.data.data;
};

export const updateShop = async (
  shopId: number,
  payload: {
    shop_name?: string;
    shop_code?: string;
    auto_shipment_enabled?: boolean;
  }
): Promise<Shop> => {
  const response = await api.put<ApiResponse<Shop>>(`/api/shop/${shopId}`, payload);
  return response.data.data;
};
