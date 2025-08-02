import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "../ui/button";
import { HPPEntry } from "@/types/HPP";
import { formatRupiah } from "@/lib/helper";

interface HPPTableProps {
  entries: HPPEntry[];
  setEditing: (value: HPPEntry | null) => void;
  setFormSku: (val: string) => void;
  setFormHpp: (val: string) => void;
  setOpenModal: (val: boolean) => void;
  handleDelete: (val: number) => void;
}
function HPPTable({
  entries,
  setEditing,
  setFormHpp,
  setFormSku,
  setOpenModal,
  handleDelete,
}: HPPTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>SKU</TableHead>
          <TableHead>HPP</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((row) => (
          <TableRow key={row.id}>
            <TableCell>{row.id}</TableCell>
            <TableCell>{row.sku_rep}</TableCell>
            <TableCell>{formatRupiah(row.hpp)}</TableCell>
            <TableCell className="space-x-2">
              <Button
                size="sm"
                onClick={() => {
                  setEditing(row);
                  setFormSku(row.sku_rep);
                  setFormHpp(String(row.hpp));
                  setOpenModal(true);
                }}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleDelete(row.id)}
              >
                Delete
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default HPPTable;
