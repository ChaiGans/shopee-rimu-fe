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

export type ProductExportFormat = "json" | "csv";

export interface ExportMarketplaceProductsParams {
  shopId: number;
  statuses?: ProductStatus[];
  format: ProductExportFormat;
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

export const exportMarketplaceProducts = async (
  params: ExportMarketplaceProductsParams,
): Promise<void> => {
  const searchParams = new URLSearchParams();
  searchParams.set("format", params.format);
  (params.statuses ?? []).forEach((status) => {
    searchParams.append("status", status);
  });

  const response = await api.get<Blob>(
    `/api/marketplace/product/${params.shopId.toString()}/export?${searchParams.toString()}`,
    {
      responseType: "blob",
      validateStatus: () => true,
    },
  );

  const contentType = response.headers["content-type"];
  const contentDisposition = response.headers["content-disposition"];
  const isDownloadResponse =
    response.status >= 200 &&
    response.status < 300 &&
    typeof contentDisposition === "string" &&
    /attachment/i.test(contentDisposition);

  if (isDownloadResponse) {
    const blob = new Blob([response.data], {
      type: contentType || (params.format === "csv" ? "text/csv" : "application/json"),
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    const fileNameMatch = contentDisposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);

    link.href = url;
    link.download = fileNameMatch?.[1] || `products.${params.format}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    return;
  }

  const responseData = response.data as Blob;
  const errorText =
    typeof responseData?.text === "function" ? await responseData.text() : "";
  throw new Error(errorText || `Product ${params.format.toUpperCase()} export failed.`);
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
