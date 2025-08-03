// src/services/npgService.ts
import api from "@/api/axios";

export const uploadNPGExcel = async (
  fileDataPesananan: File,
  filePenghasilan: File
): Promise<void> => {
  const formData = new FormData();
  formData.append("FileDataPesananan", fileDataPesananan);
  formData.append("FilePenghasilan", filePenghasilan);

  const response = await api.post("/api/excel/npg/upload", formData, {
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

    const fileNameMatch = contentDisposition.match(/filename="?(.+)"?/);
    link.download = fileNameMatch?.[1] || "processed_npg.xlsx";

    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    return;
  }

  const errorText = await response.data.text?.();
  throw new Error(errorText || "Upload failed.");
};
