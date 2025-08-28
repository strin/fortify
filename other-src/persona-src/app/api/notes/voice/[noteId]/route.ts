import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: { noteId: string } }
) {
  try {
    const { noteId } = params;
    const {
      audioUrl,
      transcript,
      duration,
      title,
      content,
      public: isPublic,
    } = await request.json();

    if (!noteId) {
      return NextResponse.json(
        { error: "Missing noteId parameter" },
        { status: 400 }
      );
    }

    const updatedVoiceNote = await prisma.voiceNote.update({
      where: { id: parseInt(noteId) },
      data: {
        audioUrl,
        transcript,
        duration,
        title,
        content,
        public: isPublic,
      },
    });

    return NextResponse.json(updatedVoiceNote, { status: 200 });
  } catch (error) {
    console.error("Error updating voice note:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { noteId: string } }
) {
  try {
    const { noteId } = params;

    if (!noteId) {
      return NextResponse.json(
        { error: "Missing noteId parameter" },
        { status: 400 }
      );
    }

    await prisma.voiceNote.delete({
      where: { id: parseInt(noteId) },
    });

    return NextResponse.json(
      { message: "Voice note deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting voice note:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
