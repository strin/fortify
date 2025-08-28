"use client";
import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";

import { updateIndex } from "@/lib/content-service";

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

import { Creator } from "@/types";
import { useToast } from "@/hooks/use-toast";

import { File, isDirectory, creatorStorage } from "@/lib/supabase";

const ACCEPTED_FILE_TYPES = [".pdf", ".docx", ".txt", ".md", ".vtt", ".srt"];

function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = () => {
      const text = reader.result as string;
      resolve(text);
    };

    reader.onerror = () => {
      reject(new Error("Error reading blob as string"));
    };

    reader.readAsText(blob);
  });
}

export default function FileUpload({
  creator,
  open,
  setOpen,
  selectedFile,
}: {
  creator: Creator;
  open: boolean;
  setOpen: (open: boolean) => void;
  selectedFile?: File;
}) {
  const { toast } = useToast();

  const [uploading, setUploading] = useState(false);

  const [file, setFile] = useState(null);

  const handleFileChange = (event: any) => {
    setFile(event.target.files[0]);
  };

  const handleFormSubmit = async (event: any) => {
    event.preventDefault();
    setUploading(true);

    if (file) {
      const fileData = file;
      const { name } = fileData as { name: string };
      const path = `users/${creator.id}/files/${name}`;
      const { error } = await creatorStorage.upload(path, fileData, {
        cacheControl: "3600",
        upsert: true,
      });

      if (error) {
        toast({
          description: "Error uploading file: " + error.message,
          variant: "destructive",
        });
      } else {
        toast({
          description: "File uploaded successfully",
        });

        const { error: indexErr } = await updateIndex(creator.id, path);
        if (indexErr) {
          toast({
            description: "Error updating index: " + indexErr.message,
            variant: "destructive",
          });
        }
      }
      setUploading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(open: boolean) => {
        setOpen(open);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload File</DialogTitle>
          <DialogDescription>
            Upload a file to your chatmon&apos;s file drive. The file will be
            used as a knowledge source during conversations. Supported file
            types: PDFs (.pdf), Word Documents (.docx), Markdown (.md) and Text
            Files (.txt).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleFormSubmit}>
          <div className="grid w-full items-center gap-1.5 space-y-1">
            <Label htmlFor="picture">
              Click to pick file or drag file here
            </Label>
            <Input
              id="file-upload"
              type="file"
              className="h-16 items-center justify-center"
              accept={ACCEPTED_FILE_TYPES.join(",")}
              onChange={handleFileChange}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="submit">Upload</Button>
            </DialogClose>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
