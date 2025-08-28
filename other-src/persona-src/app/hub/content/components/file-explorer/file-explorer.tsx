"use client";

import { useState, ReactElement } from "react";
import Toolbar from "./toolbar";
import Header from "./header";
import style from "./file-explorer.module.css";
import { supabase } from "@/lib/supabase";

import FileRow from "./filerow";

import { Creator } from "@/types";
import { useEffect } from "react";

import {
  File,
  isDirectory,
  DEFAULT_SUPABASE_STORAGE_BUCKET,
} from "@/lib/supabase";

import { Skeleton } from "@/components/ui/skeleton";

export default function FileExplorer({
  creator,
  category,
  tools,
  onClickFile,
}: {
  creator: Creator;
  category: "website" | "text" | "files" | "faq";
  tools?: ReactElement[] | ReactElement;
  onClickFile?: (path: string, file: File) => void;
}) {
  const rootpath = `users/${creator.id}/${category}`;
  const [basepath, setBasepath] = useState(rootpath);
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const listFiles = async () => {
      const { data, error } = await supabase.storage
        .from(DEFAULT_SUPABASE_STORAGE_BUCKET)
        .list(basepath);
      console.log("list files data", data);
      if (error) {
        console.error("list files error in website drive", error);
      }
      if (!data) {
        console.error("no data in website drive", error);
        return;
      }
      setFiles((data as File[]) || []);
      setLoading(false);
    };
    listFiles();
  }, [basepath]);

  const gotoDirectory = (filename: string) => {
    setBasepath(basepath + "/" + filename);
  };

  const gotoParentDirectory = () => {
    console.log("path", basepath, rootpath);
    if (basepath === rootpath) {
      return;
    }
    const parts = basepath.split("/");
    parts.pop();
    setBasepath(parts.join("/"));
  };

  const handleClickFile = (file: File) => {
    if (isDirectory(file)) {
      gotoDirectory(file.name);
    }
    onClickFile && onClickFile(basepath, file);
  };

  const handleAddSource = () => {};

  return (
    <div className="overflow-y-hidden  bg-scale-200 border-panel-border-light dark:border-panel-border-dark flex h-full w-full flex-col rounded-md border bg-white">
      <Toolbar
        creatorId={creator.id}
        currentPath={basepath.slice(rootpath.length + 1)}
        setCurrentPath={(path) => {
          setBasepath(rootpath + "/" + path);
        }}
        onAddSource={handleAddSource}
        onGoBack={gotoParentDirectory}
        showGoBack={basepath !== rootpath}
        tools={tools}
      />
      <div className="file-explorer flex flex-grow overflow-x-auto justify-between h-full w-full">
        <div className="w-full relative flex flex-col ">
          <Header />
          <div className={style.file_container}>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-6 w-full mx-2.5 my-1" />
                <Skeleton className="h-6 w-full mx-2.5 my-1" />
                <Skeleton className="h-6 w-full mx-2.5 my-1" />
              </div>
            ) : (
              files.map((file) => (
                <FileRow
                  onClick={() => {
                    handleClickFile(file);
                  }}
                  key={file.name}
                  file={file}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
