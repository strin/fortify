"use client";
import { useState } from "react";
import { Creator } from "@/types";
import FileExplorer from "../components/file-explorer";
import { Button } from "@/components/ui/button";
import FileUpload from "./upload-file";
import { File } from "@/lib/supabase";
import { creatorStorage } from "@/lib/supabase";

export default function FilesDrivePage({ creator }: { creator: Creator }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="h-full">
      <FileExplorer
        creator={creator}
        category="files"
        tools={
          <Button
            size="sm"
            onClick={() => {
              setOpen(true);
            }}
          >
            Upload File
          </Button>
        }
        onClickFile={async (path: string, file: File) => {
          console.log("file", file);
          const result = await creatorStorage.createSignedUrl(
            path + "/" + file.name,
            3600 // URL expiration time in seconds
          );

          if (result && result.data) {
            const { signedUrl } = result.data;
            console.log("signedUrl", signedUrl);

            if (signedUrl) {
              window.open(signedUrl, "_blank", "noopener,noreferrer");
            }
          } else {
            console.error("Failed to create signed URL");
          }
        }}
      />

      <FileUpload creator={creator} open={open} setOpen={setOpen} />
    </div>
  );
}
