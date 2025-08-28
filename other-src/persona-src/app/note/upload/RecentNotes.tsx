"use client";

import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { VoiceNoteData, TextNoteData } from "./types";
import { Switch } from "@/components/ui/switch";
import { indexNote, deleteNoteIndex } from "@/lib/content-service";

interface AudioPlayerProps {
  audioUrl: string;
}

interface TitleEditorProps {
  note: VoiceNoteData | TextNoteData;
  creatorId: number;
}

const TitleEditor: React.FC<TitleEditorProps> = ({ note, creatorId }) => {
  const [title, setTitle] = useState(note.title || "Untitled");

  const [debouncedTitle, setDebouncedTitle] = useState(
    note.title || "Untitled"
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (debouncedTitle !== note.title) {
        updateTitle(debouncedTitle);
        indexNote(creatorId, { ...note, title: debouncedTitle });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [debouncedTitle, note.title]);

  const updateTitle = async (newTitle: string) => {
    try {
      if (note.type === "voice") {
        const response = await axios.post(`/api/notes/voice/${note.id}`, {
          title: newTitle,
        });
        console.log("Title updated:", response.data);
      } else if (note.type === "text") {
        const response = await axios.post(`/api/notes/text/${note.id}`, {
          title: newTitle,
        });
        console.log("Title updated:", response.data);
      }
    } catch (error) {
      console.error("Error updating title:", error);
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTitle(e.target.value);
    setDebouncedTitle(e.target.value);
  };

  return (
    <textarea
      className="font-semibold mb-1 w-full bg-transparent border-none focus:outline-none resize-none overflow-hidden"
      value={title}
      onChange={handleTitleChange}
      rows={2}
      onInput={(e) => {
        const target = e.target as HTMLTextAreaElement;
        target.style.height = "auto";
        target.style.height = target.scrollHeight + "px";
      }}
    />
  );
};

interface SummaryEditorProps {
  note: VoiceNoteData | TextNoteData;
  creatorId: number;
  onNoteUpdate?: (note: VoiceNoteData | TextNoteData) => void;
}

const SummaryEditor: React.FC<SummaryEditorProps> = ({
  note,
  creatorId,
  onNoteUpdate,
}) => {
  let usingTranscript = false;
  if (note.type === "voice" && !(note as VoiceNoteData).content) {
    usingTranscript = true;
  }
  const content =
    note.type === "text"
      ? (note as TextNoteData).content
      : usingTranscript
        ? (note as VoiceNoteData).transcript?.fullText
        : (note as VoiceNoteData).content;
  const [summary, setSummary] = useState(content || "");
  const [debouncedSummary, setDebouncedSummary] = useState(content || "");

  useEffect(() => {
    const timer = setTimeout(() => {
      //console.log("debouncedSummary", debouncedSummary);
      //console.log("content", content);
      //console.log("debouncedSummary !== content", debouncedSummary !== content);
      if (debouncedSummary !== content) {
        updateSummary(debouncedSummary);
        onNoteUpdate?.({ ...note, content: debouncedSummary } as
          | VoiceNoteData
          | TextNoteData);
        indexNote(creatorId, { ...note, content: debouncedSummary });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [debouncedSummary, content]);

  const updateSummary = async (newSummary: string) => {
    try {
      if (note.type === "text") {
        const response = await axios.post(`/api/notes/text/${note.id}`, {
          content: newSummary,
        });
        console.log("Summary updated:", response.data);
      } else if (note.type === "voice") {
        if (usingTranscript) {
          const response = await axios.post(`/api/notes/voice/${note.id}`, {
            transcript: {
              fullText: newSummary,
              words: note.transcript?.words || [],
            },
          });
          console.log("Summary updated:", response.data);
        } else {
          const response = await axios.post(`/api/notes/voice/${note.id}`, {
            content: newSummary,
          });
          console.log("Summary updated:", response.data);
        }
      }
    } catch (error) {
      console.error("Error updating summary:", error);
    }
  };

  const handleSummaryChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSummary(e.target.value);
    setDebouncedSummary(e.target.value);
  };

  return (
    <textarea
      className="text-sm w-full bg-transparent border-none focus:outline-none resize-none"
      value={summary}
      onChange={handleSummaryChange}
      placeholder="Add a summary..."
      rows={8}
    />
  );
};

const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioUrl }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [signedUrl, setSignedUrl] = useState("");

  const getSignedUrl = async (supabasePath: string) => {
    const response = await axios.get(
      `/api/supabase/signedUrl?prefix=${supabasePath}`
    );
    return response.data.signedUrl;
  };

  useEffect(() => {
    if (!audioUrl) return;
    if (audioUrl.startsWith("supabase://")) {
      getSignedUrl(audioUrl.split("supabase://")[1]).then((signedUrl) => {
        console.log("Signed URL:", signedUrl);
        setSignedUrl(signedUrl);
      });
    }
  }, [audioUrl]);

  useEffect(() => {
    if (!signedUrl) return;
  }, [signedUrl]);

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    console.log("duration changed", audioRef.current?.duration);
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleDurationChange = () => {
    if (audioRef.current && audioRef.current.duration !== duration) {
      console.log("duration changed", audioRef.current?.duration);
      setDuration(audioRef.current.duration);
    }
  };

  const handleLoadedMetadata = () => {
    // https://stackoverflow.com/questions/21522036/html-audio-tag-duration-always-infinity
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      if (audioRef.current.duration === Infinity) {
        audioRef.current.currentTime = 10000000;
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.currentTime = 0; // to reset the time, so it starts at the beginning
          }
        }, 100);
      }
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center">
      <audio
        ref={audioRef}
        src={signedUrl}
        onTimeUpdate={handleTimeUpdate}
        // onDurationChange={handleDurationChange}
        // onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />
      <Button onClick={togglePlayPause} variant="outline" size="sm">
        {isPlaying ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="6" y="4" width="4" height="16"></rect>
            <rect x="14" y="4" width="4" height="16"></rect>
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
        )}
      </Button>
      {/* <div className="text-sm px-2">{formatTime(currentTime)} </div> */}
    </div>
  );
};

export function NoteActions({
  note,
  creatorId,
  onDelete,
  onMakePublic,
  publicOnly = false,
}: {
  note: VoiceNoteData | TextNoteData;
  creatorId: number;
  onDelete?: (id: number) => void;
  onMakePublic?: (id: number) => void;
  publicOnly?: boolean;
}) {
  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`/api/notes/${note.type}/${id}`);
      deleteNoteIndex(creatorId, note);
      if (note.public) {
        // delete the private note index as well.
        deleteNoteIndex(creatorId, { ...note, public: false });
      }
      onDelete?.(id);
    } catch (error) {
      console.error("Error deleting note:", error);
      return;
    }
    onDelete?.(id);
  };

  const handleMakePublic = async (id: number) => {
    await axios.post(`/api/notes/${note.type}/${id}`, {
      public: !note.public,
    });
    onMakePublic?.(id);

    if (note.public === false) {
      // index the note again using the new public namespace.
      indexNote(creatorId, { ...note, public: !note.public });
    } else {
      // delete the note index
      deleteNoteIndex(creatorId, { ...note, public: true });
    }
  };

  return (
    <div className="flex space-x-2 w-full justify-end">
      <Button
        variant="destructive"
        size="sm"
        onClick={() => handleDelete(note.id)}
        className="bg-red-900 hover:bg-red-800 text-white"
      >
        Delete
      </Button>
      {!publicOnly && (
        <div className="flex items-center space-x-2">
          <label
            htmlFor={`toggle-${note.id}`}
            className="text-sm text-gray-300"
          >
            Public
          </label>
          <Switch
            id={`toggle-${note.id}`}
            checked={note.public}
            onCheckedChange={() => handleMakePublic(note.id)}
            className="data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-gray-700"
          />
        </div>
      )}
    </div>
  );
}

interface RecentNotesProps {
  creatorId: number;
  recentVoiceNotes: VoiceNoteData[];
  recentTextNotes: TextNoteData[];
  publicOnly?: boolean; // show only public notes.
}

export default function RecentNotes({
  creatorId,
  recentVoiceNotes,
  recentTextNotes,
  publicOnly = false,
}: RecentNotesProps) {
  const [expandedNote, setExpandedNote] = useState<number | null>(null);
  const [mergedNotes, setMergedNotes] = useState<
    (VoiceNoteData | TextNoteData)[]
  >([]);

  useEffect(() => {
    let allNotes = [...recentVoiceNotes, ...recentTextNotes];
    if (publicOnly) {
      allNotes = allNotes.filter((note) => note.public);
    }
    const sortedNotes = allNotes.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    setMergedNotes(sortedNotes);
  }, [recentVoiceNotes, recentTextNotes]);

  const handleOnDelete = (id: number) => {
    setMergedNotes(mergedNotes.filter((note) => note.id !== id));
  };

  const handleOnMakePublic = (id: number) => {
    setMergedNotes(
      mergedNotes.map((note) =>
        note.id === id ? { ...note, public: !note.public } : note
      )
    );
  };

  return (
    <div className="mt-4 px-4 overflow-y-scroll">
      {mergedNotes.length === 0 ? (
        <p>No recent voice notes found.</p>
      ) : (
        Object.entries(
          mergedNotes.reduce(
            (acc, note) => {
              const noteDate = new Date(note.createdAt);
              const date = noteDate.toLocaleDateString("en-US", {
                month: "2-digit",
                day: "2-digit",
              });
              const hour = noteDate.getHours();
              let timeOfDay;
              if (hour < 12) {
                timeOfDay = "Morning";
              } else if (hour < 18) {
                timeOfDay = "Afternoon";
              } else {
                timeOfDay = "Evening";
              }
              const key = `${date}-${timeOfDay}`;
              if (!acc[key]) {
                acc[key] = [];
              }
              acc[key].push(note as VoiceNoteData | TextNoteData);
              return acc;
            },
            {} as Record<string, (VoiceNoteData | TextNoteData)[]>
          )
        ).map(([dateTime, notes]) => {
          const [date, timeOfDay] = dateTime.split("-");
          return (
            <div key={dateTime}>
              <h3 className="text-sm font-mono mt-4 mb-2 text-left px-1 text-gray-400">
                {date} {timeOfDay}
              </h3>
              <ul>
                {(notes as (VoiceNoteData | TextNoteData)[]).map(
                  (note: VoiceNoteData | TextNoteData) => (
                    <li
                      key={note.id}
                      className="p-1 rounded cursor-pointer text-left"
                    >
                      <div className="flex justify-start space-x-4 items-center">
                        <span className="text-sm min-w-[40px] text-gray-400">
                          {new Date(note.createdAt).toLocaleTimeString(
                            "en-US",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: false,
                            }
                          )}
                        </span>
                        {expandedNote !== note.id && (
                          <span
                            className="font-normal flex-grow truncate"
                            title={note.title || "Untitled"}
                            onClick={() =>
                              setExpandedNote(
                                expandedNote === note.id ? null : note.id
                              )
                            }
                          >
                            {note.title || "Untitled"}
                          </span>
                        )}
                        {expandedNote === note.id && note.type === "voice" && (
                          <>
                            <TitleEditor note={note} creatorId={creatorId} />
                            <span className="text-sm text-gray-400 min-w-[30px] text-right">
                              <AudioPlayer audioUrl={note.audioUrl} />
                            </span>
                          </>
                        )}
                        {expandedNote === note.id && note.type === "text" && (
                          <TitleEditor note={note} creatorId={creatorId} />
                        )}
                        <span className="text-sm text-gray-400 min-w-[30px] text-right">
                          {note.type === "voice"
                            ? Math.floor(note.duration) + "s"
                            : ""}
                          {note.type === "text" ? "txt" : ""}
                        </span>
                      </div>
                      {expandedNote === note.id && note.type === "voice" && (
                        <>
                          <span className="mt-2">
                            <SummaryEditor
                              note={note}
                              creatorId={creatorId}
                              onNoteUpdate={(updatedNote) => {
                                setMergedNotes(
                                  mergedNotes.map((n) =>
                                    n.id === note.id ? updatedNote : n
                                  )
                                );
                              }}
                            />
                          </span>
                          <NoteActions
                            note={note}
                            creatorId={creatorId}
                            onDelete={handleOnDelete}
                            onMakePublic={handleOnMakePublic}
                            publicOnly={publicOnly}
                          />
                        </>
                      )}
                      {expandedNote === note.id && note.type === "text" && (
                        <div className="mt-2">
                          <SummaryEditor
                            note={note}
                            creatorId={creatorId}
                            onNoteUpdate={(updatedNote) => {
                              setMergedNotes(
                                mergedNotes.map((n) =>
                                  n.id === note.id ? updatedNote : n
                                )
                              );
                            }}
                          />
                          <NoteActions
                            note={note}
                            creatorId={creatorId}
                            onDelete={handleOnDelete}
                            onMakePublic={handleOnMakePublic}
                            publicOnly={publicOnly}
                          />
                        </div>
                      )}
                    </li>
                  )
                )}
              </ul>
            </div>
          );
        })
      )}
    </div>
  );
}
