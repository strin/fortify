"use client";
import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { supabase } from "@/lib/supabase";
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
import { creatorStorage } from "@/lib/supabase";

import { Creator } from "@/types";
import { useToast } from "@/hooks/use-toast";

import { File, isDirectory } from "@/lib/supabase";

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

export default function TextEditor({
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

  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");

  const handleChangeBody = (e: any) => {
    setText(e.target.value);
  };

  const handleChangeTitle = (e: any) => {
    setTitle(e.target.value);
  };

  const handleSave = async () => {
    // TODO: figure out a way to encode the title.
    const path = `users/${creator.id}/text/${title}.md`;
    const { data, error } = await creatorStorage.upload(path, text, {
      cacheControl: "3600",
      upsert: true,
    });
    console.log("error", error);
    if (!error) {
      toast({
        description: `Successfully created file ${title}`,
      });
    }

    const { error: indexErr } = await updateIndex(creator.id, path);
    if (indexErr) {
      toast({
        description: "Error updating index: " + indexErr.message,
        variant: "destructive",
      });
    }
    setOpen(false);
  };

  useEffect(() => {
    if (!selectedFile) return;

    setLoading(true);

    const fetchFile = async () => {
      console.log("fetching file", selectedFile);
      const { data, error } = await creatorStorage.download(
        `users/${creator.id}/text/${selectedFile.name}`
      );

      if (!error) {
        const text = await readBlob(data as Blob);
        setText(text);
        if (selectedFile.name.endsWith(".md")) {
          setTitle(selectedFile.name.slice(0, -3));
        } else {
          console.error("Selected file does not end with .md");
          setTitle(selectedFile.name);
        }
        setLoading(false);
      } else {
        toast({
          description: `Error fetching file ${selectedFile.name}`,
          variant: "destructive",
        });
      }
    };

    fetchFile();
  }, [selectedFile]);

  return (
    <Dialog
      open={open}
      onOpenChange={(open: boolean) => {
        setOpen(open);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Text Editor</DialogTitle>
        </DialogHeader>
        {loading ? (
          <Skeleton className="h-10 w-full mx-2.5 my-1" />
        ) : (
          <Input
            placeholder="Name this file"
            value={title}
            onChange={handleChangeTitle}
            className="mb-4"
          />
        )}
        {loading ? (
          <Skeleton className="h-64 w-full mx-2.5 my-1" />
        ) : (
          <Textarea
            className="my-2 h-64 max-h-96 "
            onChange={handleChangeBody}
            value={text}
          ></Textarea>
        )}
        <br />
        <Button onClick={handleSave}>Save</Button>
      </DialogContent>
    </Dialog>
  );
}
