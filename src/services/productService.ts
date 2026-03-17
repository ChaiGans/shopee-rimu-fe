import api from "@/api/axios";
import { ApiResponse } from "@/types/ApiResponse";
import {
  ProductHPPUploadPreview,
  ProductListData,
  ProductStatus,
} from "@/types/Product";

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
  searchParams.set("page", params.page.toString());
  searchParams.set("size", params.size.toString());

  (params.statuses ?? []).forEach((status) => {
    searchParams.append("status", status);
  });

  const response = await api.get<ApiResponse<ProductListData>>(
    `/api/marketplace/product/${params.shopId.toString()}/list?${searchParams.toString()}`,
  );
  return response.data.data;
};

export const upsertProductHPP = async (payload: {
  sku_rep: string;
  hpp: number;
}): Promise<void> => {
  await api.put("/api/marketplace/product/hpp", payload);
};

export const previewProductHPPUpload = async (
  file: File,
): Promise<ProductHPPUploadPreview> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post<ApiResponse<ProductHPPUploadPreview>>(
    "/api/marketplace/product/hpp/upload-preview",
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    },
  );

  return response.data.data;
};

export const applyProductHPPUpload = async (
  rows: Array<{ sku_rep: string; hpp: number }>,
): Promise<void> => {
  await api.post("/api/marketplace/product/hpp/upload-apply", { rows });
};
