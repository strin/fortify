"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

import { Creator } from "@/types";
import TextEditor from "./text-editor";
import FileExplorer from "../components/file-explorer";

import { File, isDirectory } from "@/lib/supabase";

export default function TextDrivePage({
  creator,
}: {
  creator: Creator;
}) {
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
        category="text"
        tools={
          <Button
            size="sm"
            onClick={() => {
              setOpen(true);
            }}
          >
            Create File
          </Button>
        }
        onClickFile={handleClickFile}
      />
      <TextEditor
        creator={creator}
        open={open}
        setOpen={setOpen}
        selectedFile={selectedFile}
      />
    </div>
  );
}
