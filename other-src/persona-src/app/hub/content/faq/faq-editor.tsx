"use client";
import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { updateIndex } from "@/lib/content-service";
import { creatorStorage } from "@/lib/supabase";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
} from "@/components/ui/dialog";

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

export default function FAQEditor({
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
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  const handleChangeAnswer = (e: any) => {
    setAnswer(e.target.value);
  };

  const handleChangeQuestion = (e: any) => {
    setQuestion(e.target.value);
  };

  const handleSave = async () => {
    // TODO: figure out a way to encode the title.
    const path = `users/${creator.id}//faq/${question}`;
    const { data, error } = await creatorStorage.upload(path, answer, {
      cacheControl: "3600",
      upsert: true,
    });
    if (error) {
      toast({
        description: "Error saving FAQ: " + error.message,
        variant: "destructive",
      });
      return;
    }
    console.log("error", error);
    if (!error) {
      toast({
        description: `Successfully created FAQ: ${question}`,
      });

      const { error: indexErr } = await updateIndex(creator.id, path);
      if (indexErr) {
        toast({
          description: "Error updating index: " + indexErr.message,
          variant: "destructive",
        });
      }
    }

    setOpen(false);
  };

  useEffect(() => {
    if (!selectedFile) {
      setAnswer("");
      setQuestion("");
      return;
    }

    setLoading(true);

    const fetchFile = async () => {
      console.log("fetching file", selectedFile);
      const { data, error } = await creatorStorage.download(
        `users/${creator.id}/faq/${selectedFile.name}`
      );

      if (!error) {
        const answer = await readBlob(data as Blob);
        setQuestion(selectedFile.name);
        setAnswer(answer);
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
          <DialogTitle>Frequently Asked Questions</DialogTitle>
        </DialogHeader>
        {loading ? (
          <Skeleton className="h-10 w-full mx-2.5 my-1" />
        ) : (
          <Input
            placeholder="Question"
            value={question}
            onChange={handleChangeQuestion}
            className="my-2"
          />
        )}
        {loading ? (
          <Skeleton className="h-64 w-full mx-2.5 my-1" />
        ) : (
          <Textarea
            value={answer}
            onChange={handleChangeAnswer}
            placeholder="Answer"
            className="my-2 h-24 max-h-48"
          ></Textarea>
        )}
        <br />
        <Button onClick={handleSave}>Save</Button>
      </DialogContent>
    </Dialog>
  );
}
