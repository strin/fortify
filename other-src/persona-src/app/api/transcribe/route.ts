import { NextResponse } from "next/server";
import { createClient } from "@deepgram/sdk";
import { creatorStorage } from "@/lib/supabase";

const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

export async function POST(request: Request) {
  try {
    const { supabasePath } = await request.json();

    if (!supabasePath) {
      return NextResponse.json(
        { error: "Missing supabasePath" },
        { status: 400 }
      );
    }

    // Get the public URL of the file from Supabase
    const { data } = await creatorStorage.createSignedUrl(
      supabasePath,
      60 * 60 * 24
    );

    if (!data || !data.signedUrl) {
      return NextResponse.json(
        { error: "Failed to get signed URL" },
        { status: 500 }
      );
    }

    const signedUrl = data.signedUrl;

    // Transcribe the audio using Deepgram
    const { result } = await deepgram.listen.prerecorded.transcribeUrl(
      { url: signedUrl },
      {
        model: "nova-2",
      }
    );

    const transcriptWithTimestamps =
      result?.results?.channels[0].alternatives[0].words.map((word) => ({
        word: word.word,
        start: word.start,
        end: word.end,
      }));

    const transcript = {
      fullText: result?.results?.channels[0].alternatives[0].transcript,
      words: transcriptWithTimestamps,
    };

    return NextResponse.json({ transcript }, { status: 200 });
  } catch (error) {
    console.error("Error transcribing audio:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
