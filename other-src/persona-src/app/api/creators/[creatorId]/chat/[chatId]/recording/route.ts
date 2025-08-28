import { NextResponse } from "next/server";
import { creatorStorage } from "@/lib/supabase";

enum RecordingType {
  USER = "user",
  ASSISTANT = "assistant",
}

export async function POST(
  request: Request,
  { params }: { params: { creatorId: string; chatId: string } }
) {
  try {
    // Get the recording type from request headers
    const recordingType = request.headers.get(
      "x-recording-type"
    ) as RecordingType;

    if (
      !recordingType ||
      !Object.values(RecordingType).includes(recordingType)
    ) {
      return NextResponse.json(
        { error: "Invalid or missing recording type" },
        { status: 400 }
      );
    }

    // Get the audio blob directly from request body
    const audioBlob = await request.blob();

    if (!audioBlob) {
      return NextResponse.json(
        { error: "No audio data provided" },
        { status: 400 }
      );
    }

    // Generate filename with appropriate extension
    const filePath = `users/${params.creatorId}/chats/${params.chatId}/recordings/${recordingType}.webm`;

    const { data, error } = await creatorStorage.upload(filePath, audioBlob, {
      cacheControl: "3600",
      upsert: false,
      contentType: "audio/webm", // Set the correct content type
    });

    if (error) {
      console.error("Error uploading recording:", error);
      return NextResponse.json(
        { error: "Failed to upload recording" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      path: filePath,
      url: data.path,
    });
  } catch (error) {
    console.error("Error handling recording upload:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
