import api from "@/api/axios";
import { PaginatedHPPResponse, HPPEntry } from "@/types/HPP";

export const listHPP = async (
  page: number,
  size: number,
  search: string
): Promise<PaginatedHPPResponse> => {
  const res = await api.get<PaginatedHPPResponse>("/api/excel/hpp", {
    params: { page, size, search },
  });
  return res.data;
};

export const createHPP = async (payload: Omit<HPPEntry, "id" | "user_id">) => {
  await api.post("/api/excel/hpp", payload);
};

export const updateHPP = async (
  id: number,
  payload: Omit<HPPEntry, "id" | "user_id">
) => {
  await api.put(`/api/excel/hpp/${id}`, payload);
};

export const deleteHPP = async (id: number) => {
  await api.delete(`/api/excel/hpp/${id}`);
};

export const deleteAllHPP = async () => {
  await api.delete(`/api/excel/hpp`);
};
export const uploadHPPExcel = async (
  file: File
): Promise<"success" | "partial"> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post("/api/excel/hpp/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    responseType: "blob",
    validateStatus: () => true,
  });

  const contentType = response.headers["content-type"];
  const contentDisposition = response.headers["content-disposition"];

  if (
    response.status === 200 &&
    contentType?.includes(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ) &&
    contentDisposition?.includes("attachment")
  ) {
    const blob = new Blob([response.data], { type: contentType });
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;

    const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
    link.download = fileNameMatch?.[1] || "error_log.xlsx";

    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    return "partial";
  }

  if (response.status !== 200) {
    const errorText = await response.data.text?.();
    throw new Error(errorText || "Upload failed.");
  }

  return "success";
};
