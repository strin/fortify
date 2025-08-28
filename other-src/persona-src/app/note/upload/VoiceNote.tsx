"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import axios from "axios";
import { creatorStorage } from "@/lib/supabase";
import { Creator } from "@/types";
import { Button } from "@/components/ui/button";
import RecentNotes from "./RecentNotes";
import AddTextNote from "./AddTextNote";
import { VoiceNoteData, TextNoteData } from "./types";
import { Mic } from "lucide-react";
import { indexNote } from "@/lib/content-service";
import { PageSlideIn } from "@/lib/motion";
import { Mixpanel } from "@/lib/mixpanel";

interface VoiceNoteProps {
  creator: Creator;
  publicOnly?: boolean; // show only public notes.
}

const VoiceNote: React.FC<VoiceNoteProps> = ({
  creator,
  publicOnly = false,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recentVoiceNotes, setRecentVoiceNotes] = useState<VoiceNoteData[]>([]);
  const [recentTextNotes, setRecentTextNotes] = useState<TextNoteData[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [textNoteOpen, setTextNoteOpen] = useState(false);
  const [loadingVoiceNotes, setLoadingVoiceNotes] = useState(true);
  const [loadingTextNotes, setLoadingTextNotes] = useState(true);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        chunksRef.current = [];
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
    }
  };

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const calculateAudioDuration = useCallback((blob: Blob): Promise<number> => {
    return new Promise((resolve, reject) => {
      const audioContext = new (window.AudioContext || window.AudioContext)();
      const reader = new FileReader();
      reader.onload = (e) => {
        audioContext.decodeAudioData(
          e.target?.result as ArrayBuffer,
          (buffer) => {
            const duration = buffer.duration;
            resolve(duration);
          },
          reject
        );
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    });
  }, []);

  const handleSaveTextNote = async (content: string) => {
    console.log("Saving text note:", content);
    try {
      // Summarize the text note
      const {
        data: { title },
      } = await axios.post("/api/notes/voice/summarize/title", {
        fullText: content,
      });

      // Use the generated title in the note creation
      const response = await axios.post("/api/notes/text", {
        content,
        title,
        public: !!publicOnly,
        creatorId: creator.id,
      });
      console.log("Text note saved:", response.data);

      indexNote(creator.id, {
        ...response.data,
        type: "text",
      });

      setTextNoteOpen(false);
      await fetchRecentTextNotes();

      Mixpanel.track("Text Note Created", {
        creatorId: creator.id,
      });
    } catch (error) {
      console.error("Error saving text note:", error);
    }
  };

  const uploadVoiceNote = useCallback(
    async (blob: Blob) => {
      try {
        const duration = await calculateAudioDuration(blob);
        setIsUploading(true);

        const fileName = `voice_note_${Date.now()}.webm`;
        const supabasePath = `users/${creator.id}/notes/voice/${fileName}`;
        const { data, error } = await creatorStorage.upload(supabasePath, blob);

        if (error) throw error;

        const response = await axios.post("/api/notes/voice", {
          audioUrl: `supabase://${supabasePath}`,
          duration: duration,
          transcript: {}, // You may want to add transcription logic
          creatorId: creator.id,
          public: !!publicOnly,
        });

        console.log("Voice note created:", response.data);
        const {
          data: { transcript },
        } = await axios.post("/api/transcribe", {
          supabasePath,
        });
        console.log("Transcript:", transcript);

        console.log("Updating voice note with transcript:", transcript);
        await axios.post(`/api/notes/voice/${response.data.id}`, {
          transcript,
        });

        console.log("Summarizing voice note...");
        const {
          data: { title },
        } = await axios.post(`/api/notes/voice/summarize/title`, {
          fullText: transcript?.fullText,
        });
        console.log("Title:", title);

        console.log("Summarizing voice note into bullet points...");
        const {
          data: { bulletPoints },
        } = await axios.post(`/api/notes/voice/summarize/bullet`, {
          fullText: transcript?.fullText,
        });
        console.log("Bullet points:", bulletPoints);

        console.log("Updating voice note with title:", title);
        await axios.post(`/api/notes/voice/${response.data.id}`, {
          title,
          content: bulletPoints,
        });

        indexNote(creator.id, {
          ...response.data,
          transcript,
          content: bulletPoints,
          title,
          type: "voice",
        });

        await fetchRecentVoiceNotes();
        setIsUploading(false);

        Mixpanel.track("Voice Note Created", {
          creatorId: creator.id,
        });
      } catch (error) {
        console.error("Error uploading voice note:", error);
      }
    },
    [creator.id, calculateAudioDuration]
  );

  const fetchRecentVoiceNotes = useCallback(async () => {
    try {
      const response = await axios.get(
        `/api/notes/voice?creatorId=${creator.id}&publicOnly=${publicOnly}`
      );
      const voiceNotes = response.data as VoiceNoteData[];
      const voiceNotesWithType = voiceNotes.map((note) => ({
        ...note,
        type: "voice" as const,
      }));
      setRecentVoiceNotes(voiceNotesWithType);
    } catch (error) {
      console.error("Error fetching recent notes:", error);
    }
  }, [creator.id]);

  const fetchRecentTextNotes = useCallback(async () => {
    try {
      const response = await axios.get(
        `/api/notes/text?creatorId=${creator.id}&publicOnly=${publicOnly}`
      );
      const textNotes = response.data as TextNoteData[];
      const textNotesWithType = textNotes.map((note) => ({
        ...note,
        type: "text" as const,
      }));
      setRecentTextNotes(textNotesWithType);
    } catch (error) {
      console.error("Error fetching recent notes:", error);
    }
  }, [creator.id]);

  useEffect(() => {
    fetchRecentVoiceNotes().then(() => setLoadingVoiceNotes(false));
  }, [fetchRecentVoiceNotes]);

  useEffect(() => {
    fetchRecentTextNotes().then(() => setLoadingTextNotes(false));
  }, [fetchRecentTextNotes]);

  useEffect(() => {
    if (audioBlob) {
      console.log("uploading voice note", audioBlob);
      uploadVoiceNote(audioBlob);
    }
  }, [audioBlob, uploadVoiceNote]);

  return (
    <PageSlideIn>
      <div className="flex flex-col h-full overflow-none">
        <div className="flex-1 pt-4">
          <div className="overflow-y-auto h-[calc(100vh-280px)]">
            {loadingVoiceNotes || loadingTextNotes ? (
              <div className="animate-pulse space-y-4 p-4">
                <div className="h-4 bg-gray-700 rounded-md" />
                <div className="h-4 bg-gray-700 rounded-md" />
                <div className="h-4 bg-gray-700 rounded-md" />
                <div className="h-4 bg-gray-700 rounded-md" />
                <div className="h-4 bg-gray-700 rounded-md" />
              </div>
            ) : (
              <RecentNotes
                creatorId={creator.id}
                recentVoiceNotes={recentVoiceNotes}
                recentTextNotes={recentTextNotes}
                publicOnly={publicOnly}
              />
            )}
          </div>
        </div>
        <div className="flex flex-row justify-end space-x-4">
          {isUploading ? (
            <div className="rounded-full w-14 h-14 flex items-center justify-center bg-gray-200">
              <span className="text-2xl animate-spin">↻</span>
            </div>
          ) : (
            <>
              <Button
                variant={isRecording ? "destructive" : "default"}
                onClick={isRecording ? stopRecording : startRecording}
                className="rounded-full w-14 h-14 flex items-center justify-center"
              >
                {isRecording ? (
                  <span className="text-3xl">■</span>
                ) : (
                  <Mic className="w-8 h-8 text-white" />
                )}
              </Button>
              <Button
                variant="default"
                onClick={() => {
                  setTextNoteOpen(true);
                }}
                className="rounded-full w-14 h-14 flex items-center justify-center"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </Button>
            </>
          )}
        </div>
        <AddTextNote
          open={textNoteOpen}
          onOpenChange={setTextNoteOpen}
          onSave={handleSaveTextNote}
        />
      </div>
    </PageSlideIn>
  );
};

export default VoiceNote;
