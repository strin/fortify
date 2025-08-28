import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: { noteId: string } }
) {
  try {
    const { noteId } = params;
    const { title, content, public: isPublic } = await request.json();

    if (!noteId) {
      return NextResponse.json(
        { error: "Missing noteId parameter" },
        { status: 400 }
      );
    }

    const updatedTextNote = await prisma.textNote.update({
      where: { id: parseInt(noteId) },
      data: {
        title,
        content,
        public: isPublic,
      },
    });

    return NextResponse.json(updatedTextNote, { status: 200 });
  } catch (error) {
    console.error("Error updating text note:", error);
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

    const deletedTextNote = await prisma.textNote.delete({
      where: { id: parseInt(noteId) },
    });

    return NextResponse.json(deletedTextNote, { status: 200 });
  } catch (error) {
    console.error("Error deleting text note:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
