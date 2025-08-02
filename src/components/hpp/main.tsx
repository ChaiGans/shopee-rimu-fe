import React, { useEffect, useState } from "react";
import {
  listHPP,
  createHPP,
  updateHPP,
  deleteHPP,
  uploadHPPExcel,
  deleteAllHPP,
} from "@/services/hppService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "../ui/use-toast";
import { Input } from "@/components/ui/input";
import { HPPEntry } from "@/types/HPP";
import HPPPagination from "./hpp-pagination";
import AddEditHPPDialog from "./add-edit-hpp-dialog";
import HPPTable from "./hpp-table";
import Loading from "../loading";

const PAGE_SIZE = 50;

const MainHPP: React.FC = () => {
  const [entries, setEntries] = useState<HPPEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState<HPPEntry | null>(null);
  const [formSku, setFormSku] = useState("");
  const [formHpp, setFormHpp] = useState("");
  const [search, setSearch] = useState("");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [pageSize, setPageSize] = useState(PAGE_SIZE);

  const { toast } = useToast();

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await listHPP(page, pageSize, search);
      setEntries(res.data);
      setTotal(res.total);
    } catch (err) {
      toast({
        title: "Load failed",
        description: `Failed to load HPPs.`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  const resetForm = () => {
    setFormSku("");
    setFormHpp("");
    setEditing(null);
  };

  const handleSave = async () => {
    if (!formSku || !formHpp) {
      toast({
        title: "Missing field",
        description: "SKU and HPP value is required",
        variant: "destructive",
      });
      return;
    }
    try {
      if (editing) {
        await updateHPP(editing.id, { sku_rep: formSku, hpp: Number(formHpp) });

        toast({
          title: "Update Success",
          description: `HPP for ${formSku} has been updated.`,
          variant: "success",
        });
      } else {
        await createHPP({ sku_rep: formSku, hpp: Number(formHpp) });

        toast({
          title: "Create Success",
          description: `HPP for ${formSku} has been updated.`,
          variant: "success",
        });
      }
      setOpenModal(false);
      resetForm();
      fetchData();
    } catch {
      toast({
        title: "Save failed",
        description: "Failed to save. Refresh page or contact support.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this HPP?")) return;
    try {
      await deleteHPP(id);

      toast({
        title: "Delete Success",
        description: `HPP for ${formSku} has been deleted.`,
        variant: "success",
      });
      fetchData();
    } catch {
      toast({
        title: "Deletion Failed",
        description: "Failed to delete.",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;
    try {
      const result = await uploadHPPExcel(selectedFile);

      if (result === "partial") {
        toast({
          title: "Partial Upload",
          description: `Some rows failed in "${selectedFile.name}". Error log downloaded.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Upload Success",
          description: `HPP file "${selectedFile.name}" uploaded successfully.`,
          variant: "success",
        });
      }

      fetchData();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast({
        title: "Upload Failed",
        description: err.message || "Something went wrong while uploading.",
        variant: "destructive",
      });
    }
  };

  const handleTruncate = async () => {
    try {
      await deleteAllHPP();

      toast({
        title: "Truncate Success",
        description: `HPP informations have been truncated`,
        variant: "success",
      });

      fetchData();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast({
        title: "Truncation failed",
        description: `Fail to truncate. \n Error : ${err.message}`,
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <CardHeader>
        <CardTitle>HPP Management</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setOpenModal(true)}>Add Manual</Button>
          <Button onClick={handleTruncate} variant={"destructive"}>
            Truncate
          </Button>
          <Input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
          />
          <Button onClick={handleFileUpload} disabled={!selectedFile}>
            Upload
          </Button>
        </div>

        <div className="flex flex-row w-full">
          <div className="flex w-full">
            <Input
              placeholder="Search SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") fetchData();
              }}
              className="max-w-sm"
            />
            <Button onClick={fetchData}>Search</Button>
          </div>

          <div className="flex  items-center gap-2">
            <label htmlFor="pageSize" className="text-sm text-nowrap">
              Page size:
            </label>
            <select
              id="pageSize"
              value={pageSize}
              onChange={(e) => {
                setPage(1);
                setPageSize(Number(e.target.value));
              }}
              className="border rounded px-2 py-1 text-sm"
            >
              {[10, 25, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <Loading />
        ) : (
          <>
            <div className="overflow-x-auto">
              <HPPTable
                entries={entries}
                setEditing={setEditing}
                setFormSku={setFormSku}
                setFormHpp={setFormHpp}
                setOpenModal={setOpenModal}
                handleDelete={handleDelete}
              />
            </div>

            <HPPPagination
              page={page}
              total={total}
              pageSize={pageSize}
              setPage={setPage}
            />
          </>
        )}
      </CardContent>

      <AddEditHPPDialog
        openModal={openModal}
        setOpenModal={setOpenModal}
        editing={editing}
        setFormSku={setFormSku}
        resetForm={resetForm}
        setFormHpp={setFormHpp}
        formSku={formSku}
        handleSave={handleSave}
        formHpp={formHpp}
      />
    </Card>
  );
};

export default MainHPP;
