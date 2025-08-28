interface NoteData {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  title: string | null;
  type: "text" | "voice";
  public: boolean;
}

export interface TextNoteData extends NoteData {
  content: string | null;
  type: "text";
}

export interface VoiceNoteData extends NoteData {
  audioUrl: string;
  transcript: {
    fullText?: string;
    words?: { word: string; start: number; end: number }[];
  } | null;
  duration: number;
  content: string | null;
  type: "voice";
}
