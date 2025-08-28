"use client";

import { useState, useEffect, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Creator } from "@/types";
import debounce from "lodash/debounce";

export default function HubPage({ creator }: { creator: Creator }) {
  const { toast } = useToast();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    const fetchExistingPrompt = async () => {
      try {
        const response = await fetch(`/api/prompts?creatorId=${creator?.id}`);
        if (response.ok) {
          const data = await response.json();
          if (data.length > 0) {
            setPrompt(data[0].content);
          }
        }
      } catch (error) {
        console.error("Error fetching existing prompt:", error);
      }
    };

    if (creator?.id) {
      fetchExistingPrompt();
    }
  }, [creator?.id]);

  const savePrompt = useCallback(
    async (promptContent: string) => {
      setLoading(true);
      try {
        const response = await fetch("/api/prompts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: promptContent,
            creatorId: creator?.id,
          }),
        });

        if (response.ok) {
          setLastSaved(new Date());
        } else {
          throw new Error("Failed to save prompt");
        }
      } catch (error) {
        toast({
          description: "Error saving prompt. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [creator?.id, toast]
  );

  const debouncedSave = useCallback(
    debounce((value: string) => savePrompt(value), 1000),
    [savePrompt]
  );

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setPrompt(newValue);
    debouncedSave(newValue);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Prompt Hub</h1>
      <div className="space-y-4">
        <div>
          <label htmlFor="prompt" className="block text-sm font-medium mb-1">
            Enter your prompt:
          </label>
          <Textarea
            id="prompt"
            value={prompt}
            onChange={handlePromptChange}
            rows={8}
            placeholder="Type your prompt here..."
            required
          />
        </div>
        {!loading && lastSaved && (
          <p className="text-sm text-gray-500">
            Last saved: {lastSaved.toLocaleTimeString()}
          </p>
        )}
        {loading && <p className="text-sm text-blue-500">Saving...</p>}
      </div>
    </div>
  );
}
