import { VoiceNoteData, TextNoteData } from "@/app/note/upload/types";

export function getContentServiceHost() {
  return (
    process.env.NEXT_PUBLIC_CREATOR_CONTENT_SERVICE || "http://localhost:5001"
  );
}

const DEFAULT_CHATMON_STORAGE_BUCKET = "creator-content";

export async function updateIndex(userId: number, path: string) {
  try {
    const response: Response = await fetch(getContentServiceHost() + "/jobs", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        userId,
        bucket: DEFAULT_CHATMON_STORAGE_BUCKET,
        path,
      }),
    });
    const data = await response.json();
    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err as Error };
  }
}

export async function deleteFileIndex(userId: number, path: string) {
  try {
    const response: Response = await fetch(
      getContentServiceHost() + "/delete-file",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId, path }),
      }
    );
    const data = await response.json();
    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err as Error };
  }
}

export async function indexNote(
  creatorId: number,
  note: VoiceNoteData | TextNoteData
) {
  const type = note.type;
  let content = "";
  if (type === "text") {
    content = note.content || "";
  } else if (type === "voice") {
    content = note.content || note.transcript?.fullText || "";
  }
  const title = note.title;
  const createdAt = note.createdAt;
  const id = note.id;

  try {
    const response: Response = await fetch(
      getContentServiceHost() + "/jobs/note",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          creatorId,
          content,
          title,
          createdAt,
          id,
          type,
          public: note.public,
        }),
      }
    );
    const data = await response.json();
    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err as Error };
  }
}

export async function indexChat({
  userId,
  creatorId,
  chatId,
  postId,
  summary,
  title,
}: {
  userId: number;
  creatorId: number;
  chatId: number;
  postId: number | null | undefined;
  summary: string;
  title: string;
}) {
  try {
    const response: Response = await fetch(
      getContentServiceHost() + "/jobs/chat",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          userId,
          creatorId,
          chatId,
          postId,
          summary,
          title,
        }),
      }
    );
    const data = await response.json();
    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err as Error };
  }
}

export async function deleteNoteIndex(
  creatorId: number,
  note: VoiceNoteData | TextNoteData
) {
  const isPublic = note.public;
  const type = note.type;

  await fetch(getContentServiceHost() + `/jobs/note/${note.id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creatorId, public: isPublic, type }),
  });
}
