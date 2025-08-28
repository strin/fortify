"use client";
import { useState } from "react";
import { Creator } from "@/types";
import { Button } from "@/components/ui/button";
import FileExplorer from "../components/file-explorer";
import FAQEditor from "./faq-editor";
import { File, isDirectory } from "@/lib/supabase";

export default function FAQDrivePage({ creator }: { creator: Creator }) {
  const [open, setOpen] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | undefined>();

  const handleClickFile = (_: string, file: File) => {
    if (!isDirectory(file)) {
      setSelectedFile(file);
      setOpen(true);
    }
  };

  return (
    <div className="h-full">
      <FileExplorer
        creator={creator}
        category="faq"
        tools={
          <Button
            size="sm"
            onClick={() => {
              setSelectedFile(undefined);
              setOpen(true);
            }}
          >
            Add FAQ
          </Button>
        }
        onClickFile={handleClickFile}
      />
      <FAQEditor
        creator={creator}
        open={open}
        setOpen={setOpen}
        selectedFile={selectedFile}
      />
    </div>
  );
}
