"use client";

import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";

interface UploadStoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (prompt: string) => void;
  creatorId: number;
}

export default function UploadStory({
  creatorId,
  open,
  onOpenChange,
  onComplete,
}: UploadStoryProps) {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [prompt, setPrompt] = useState("");

  const handleComplete = async () => {
    onOpenChange(false);

    const response = await fetch("/api/prompts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        creatorId,
      }),
    });

    if (!response.ok) {
      console.error("Failed to create prompt:", response.statusText);
      return;
    }

    const data = await response.json();
    console.log("created prompt", data);

    const promptId = data.id;

    const postResponse = await fetch("/api/posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        summary,
        promptId,
        creatorId,
        overview: prompt,
      }),
    });

    if (!postResponse.ok) {
      console.error("Failed to create post:", postResponse.statusText);
      return;
    }

    onComplete(prompt);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-gray-900 text-white">
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Step 1: Title</h2>
            <div className="space-y-2">
              <Label htmlFor="title">Story Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-gray-800 border-gray-700"
              />
            </div>
            <Button
              onClick={() => setStep(2)}
              disabled={!title}
              className="w-full bg-gray-800"
            >
              Next
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Step 2: Summary</h2>
            <div className="space-y-2">
              <Label htmlFor="summary">Story Summary</Label>
              <Textarea
                id="summary"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="bg-gray-800 border-gray-700"
              />
            </div>
            <Button
              onClick={() => setStep(3)}
              disabled={!summary}
              className="w-full bg-gray-800"
            >
              Next
            </Button>
          </div>
        )}

        {step === 3 && (
          <Card className="border-gray-700 bg-gray-800">
            <CardHeader>
              <h2 className="text-lg font-semibold">Add Story Content</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="prompt">Story Prompt</Label>
                <Textarea
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Write your story prompt here..."
                  className="bg-gray-700 border-gray-600 min-h-[200px]"
                />
              </div>
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button onClick={handleComplete} className="flex-1 bg-gray-800">
                Complete
              </Button>
            </CardFooter>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  );
}
