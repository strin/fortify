import { createClient } from "@supabase/supabase-js";

const DEFAULT_SUPABASE_URL = "https://tyvtclfftzscehjsiauo.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY
);

export interface File {
  created_at: string | null;
  updated_at: string | null;
  id: string | null;
  last_accessed_at: string | null;
  metadata: Record<string, any> | null;
  name: string;
}

export function isDirectory(file: File) {
  return file.id === null;
}

export const DEFAULT_SUPABASE_STORAGE_BUCKET = "creator-content";

export const creatorStorage = supabase.storage.from("creator-content");

export const creatorPublicStorage = supabase.storage.from("creator-public");

export async function getSignedUrl(path: string): Promise<string | null> {
  try {
    const { data, error } = await creatorStorage.createSignedUrl(path, 3600); // 1 hour expiration

    if (error) {
      console.error("Error creating signed URL:", error);
      return null;
    }

    console.log("Signed URL:", data.signedUrl);

    return data.signedUrl;
  } catch (error) {
    console.error("Error creating signed URL:", error);
    return null;
  }
}
