import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface AddTextNoteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (content: string) => void;
}

export default function AddTextNote({
  open,
  onOpenChange,
  onSave,
}: AddTextNoteProps) {
  const [content, setContent] = useState("");

  const handleSave = () => {
    onSave(content);
    setContent("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Text Note</DialogTitle>
        </DialogHeader>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Enter your note here..."
          className="min-h-[200px]"
        />
        <DialogFooter>
          <Button onClick={handleSave}>Save Note</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
