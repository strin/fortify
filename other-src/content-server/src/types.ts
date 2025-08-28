import validator from "validator";

export interface Destination {
  type: "supabase" | "s3";
}

export interface SupabaseDestination extends Destination {
  type: "supabase";
  bucket: string;
  baseDir: string;
}

export const parseDestination = (body: any): Destination => {
  if (body.type === "supabase") {
    return {
      type: "supabase",
      bucket: body.bucket,
      baseDir: body.baseDir,
    } as SupabaseDestination;
  }

  throw new Error("Invalid destination type");
};

export const validateUrl = (url: string) => {
  return validator.isURL(url);
};

interface Job {
  name: string;
  data: any;
  opts: {
    attempts?: number;
    delay?: number;
    jobId?: string;
  };
  id?: string;
  progress: number | object;
  returnvalue?: any;
  stacktrace?: any;
  timestamp: number;
  attemptsMade: number;
  finishedOn?: number;
  processedOn?: number;
  failedReason?: string;
  state?: "completed" | "failed" | "active" | "delayed" | "waiting" | "paused";
}

