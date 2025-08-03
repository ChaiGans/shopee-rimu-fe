import React, { useState } from "react";
import { uploadNPGExcel } from "@/services/npgService";

function NPGMain() {
  const [filePenghasilan, setFilePenghasilan] = useState<File | null>(null);
  const [fileDataPesananan, setFileDataPesananan] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!filePenghasilan || !fileDataPesananan) {
      alert("Please select both Excel files.");
      return;
    }

    try {
      await uploadNPGExcel(fileDataPesananan, filePenghasilan);
      alert("File processed and downloaded successfully!");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Upload failed:", error);
      alert(error?.message || "Upload failed. Please try again.");
    }
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: React.Dispatch<React.SetStateAction<File | null>>
  ) => {
    const file = e.target.files?.[0];
    if (file && file.name.endsWith(".xlsx")) {
      setFile(file);
    } else {
      alert("Only .xlsx files are allowed.");
      e.target.value = "";
    }
  };

  return (
    <div className="p-4 max-w-xl">
      <h2 className="text-xl font-bold mb-4">Upload Data NPG Bulanan</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-medium mb-1">
            Data Pesanan Bulan Tersebut (.xlsx)
          </label>
          <input
            type="file"
            accept=".xlsx"
            onChange={(e) => handleFileChange(e, setFileDataPesananan)}
          />
        </div>
        <div>
          <label className="block font-medium mb-1">
            Data Penghasilan Bulan Tersebut (.xlsx)
          </label>
          <input
            type="file"
            accept=".xlsx"
            onChange={(e) => handleFileChange(e, setFilePenghasilan)}
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Upload
        </button>
      </form>
    </div>
  );
}

export default NPGMain;
