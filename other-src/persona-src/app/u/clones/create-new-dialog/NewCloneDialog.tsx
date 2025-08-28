import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface NewCloneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newClone: {
    name: string;
    expectedDurationMs: number;
    slug: string;
  };
  setNewClone: React.Dispatch<
    React.SetStateAction<{
      name: string;
      expectedDurationMs: number;
      slug: string;
    }>
  >;
  handleCreateClone: () => Promise<void>;
  isCreatingClone: boolean;
}

export default function NewCloneDialog({
  open,
  onOpenChange,
  newClone,
  setNewClone,
  handleCreateClone,
  isCreatingClone,
}: NewCloneDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Lively
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Lively</DialogTitle>
          <DialogDescription>Set up a new lively session</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Clone Name</Label>
            <Input
              id="name"
              value={newClone.name}
              onChange={(e) =>
                setNewClone({ ...newClone, name: e.target.value })
              }
              placeholder="e.g., Professional Interview"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="time">Expected Duration</Label>
            <select
              id="time"
              className="w-full p-2 border rounded-md"
              value={newClone.expectedDurationMs}
              onChange={(e) => {
                setNewClone({
                  ...newClone,
                  expectedDurationMs: parseInt(e.target.value),
                });
              }}
            >
              <option value="15">15 min</option>
              <option value="30">30 min</option>
              <option value="45">45 min</option>
              <option value="60">60 min</option>
            </select>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleCreateClone} disabled={isCreatingClone}>
            {isCreatingClone ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
