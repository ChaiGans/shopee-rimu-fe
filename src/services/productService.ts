import api from "@/api/axios";
import { ApiResponse } from "@/types/ApiResponse";
import { ProductListData, ProductStatus } from "@/types/Product";

export interface GetMarketplaceProductsParams {
  shopId: number;
  page: number;
  size: number;
  statuses?: ProductStatus[];
}

export const getMarketplaceProducts = async (
  params: GetMarketplaceProductsParams,
): Promise<ProductListData> => {
  const searchParams = new URLSearchParams();
  searchParams.set("shop_id", params.shopId.toString());
  searchParams.set("page", params.page.toString());
  searchParams.set("size", params.size.toString());

  (params.statuses ?? []).forEach((status) => {
    searchParams.append("status", status);
  });

  const response = await api.get<ApiResponse<ProductListData>>(
    `/api/marketplace/product/list?${searchParams.toString()}`,
  );
  return response.data.data;
};
