"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Creator } from "@/types";
import { useSession } from "next-auth/react";
import { Toaster } from "@/components/ui/toaster"

interface VoiceSettings {
  voice_id: string;
}

export default function VoicePage() {
  const { data: session } = useSession();
  const creator = session?.user as Creator;
  const { toast } = useToast();

  const [voiceId, setVoiceId] = useState("");
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings | null>(
    null
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchVoiceId = async () => {
      if (session?.user?.email) {
        try {
          const response = await fetch(`/api/creators/${creator?.id}`);
          if (response.ok) {
            const data = await response.json();
            if (data.voice_settings?.voice_id) {
              setVoiceId(data.voice_settings.voice_id);
              setVoiceSettings(data.voice_settings);
            }
          }
        } catch (error) {
          console.error("Error fetching voice ID:", error);
        }
      }
    };

    fetchVoiceId();
  }, [session]);

  const handleVoiceIdChange = async (newVoiceId: string) => {
    setVoiceId(newVoiceId);
    setLoading(true);

    try {
      const response = await fetch(`/api/creators/${creator?.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          voice_settings: {
            ...voiceSettings,
            voice_id: newVoiceId,
          },
        }),
      });

      if (response.ok) {
        toast({
          title: "Voice ID updated successfully",
          description: "Your voice settings have been saved.",
        });
      } else {
        throw new Error("Failed to update voice ID");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update voice ID. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Voice Settings</h1>
      <div className="max-w-md mb-6">
        <label className="block text-sm font-medium mb-2">Creator ID</label>
        <Input
          type="text"
          value={creator?.id || ""}
          disabled={true}
          className="w-full bg-gray-50"
        />
        <p className="mt-2 text-sm text-gray-500">
          Your unique creator identifier.
        </p>
      </div>
      <div className="max-w-md">
        <label className="block text-sm font-medium mb-2">Voice ID</label>
        <Input
          type="text"
          value={voiceId}
          onChange={(e) => handleVoiceIdChange(e.target.value)}
          placeholder="Enter your voice ID"
          disabled={loading}
          className="w-full"
        />
        <p className="mt-2 text-sm text-gray-500">
          Enter the voice ID you want to use for text-to-speech conversion.
        </p>
      </div>
      <Toaster />
    </div>
  );
}
