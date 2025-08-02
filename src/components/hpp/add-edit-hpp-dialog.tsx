import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { HPPEntry } from "@/types/HPP";

interface AddEditHPPDialogProps {
  openModal: boolean;
  setOpenModal: (value: boolean) => void;
  editing: HPPEntry | null;
  setFormSku: (val: string) => void;
  resetForm: () => void;
  setFormHpp: (val: string) => void;
  formSku: string;
  handleSave: () => void;
  formHpp: string;
}

function AddEditHPPDialog({
  openModal,
  setOpenModal,
  editing,
  setFormSku,
  resetForm,
  setFormHpp,
  formSku,
  handleSave,
  formHpp,
}: AddEditHPPDialogProps) {
  return (
    <Dialog
      open={openModal}
      onOpenChange={(o) => {
        if (!o) resetForm();
        setOpenModal(o);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>{editing ? "Edit HPP" : "Add HPP"}</DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="SKU"
            value={formSku}
            onChange={(e) => setFormSku(e.target.value)}
          />
          <Input
            placeholder="HPP"
            type="number"
            value={formHpp}
            onChange={(e) => setFormHpp(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                resetForm();
                setOpenModal(false);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editing ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AddEditHPPDialog;
