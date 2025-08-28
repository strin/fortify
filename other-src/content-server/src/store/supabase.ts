import { createClient } from "@supabase/supabase-js";
import path from "path";

const DEFAULT_SUPABASE_PROJECT_URL = "https://tyvtclfftzscehjsiauo.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "";

console.log("supabase project url", process.env.SUPABASE_PROJECT_URL);
console.log("supabase project anon key", process.env.SUPABASE_PROJECT_ANON_KEY);

export const supabase = createClient(
  process.env.SUPABASE_PROJECT_URL || DEFAULT_SUPABASE_PROJECT_URL,
  process.env.SUPABASE_PROJECT_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY
);

export const writeToFile = async (
  baseDir: string,
  urlPath: string,
  content: string
) => {
  console.log("Writing to supabase", baseDir, urlPath);
  const { error } = await supabase.storage
    .from("creator-content")
    .upload(path.join(baseDir, urlPath), content, {
      cacheControl: "3600",
      upsert: true,
    });
  console.log("error", error);
  return error;
};
