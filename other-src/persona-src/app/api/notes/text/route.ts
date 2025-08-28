import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const {
      content,
      title,
      creatorId,
      public: isPublic,
    } = await request.json();

    if (!content || !title) {
      return NextResponse.json(
        { error: "Content and title are required" },
        { status: 400 }
      );
    }

    const newNote = await prisma.textNote.create({
      data: {
        content,
        title,
        public: isPublic || false,
        creator: {
          connect: {
            id: creatorId,
          },
        },
      },
    });

    return NextResponse.json(newNote, { status: 201 });
  } catch (error) {
    console.error("Error creating note:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const creatorId = searchParams.get("creatorId");

  const publicOnly = searchParams.get("publicOnly") === "true";

  if (!creatorId) {
    return NextResponse.json(
      { error: "Creator ID is required" },
      { status: 400 }
    );
  }

  if (publicOnly) {
    const notes = await prisma.textNote.findMany({
      where: { creatorId: parseInt(creatorId), public: true },
    });

    return NextResponse.json(notes, { status: 200 });
  } else {
    const notes = await prisma.textNote.findMany({
      where: { creatorId: parseInt(creatorId) },
    });

    return NextResponse.json(notes, { status: 200 });
  }
}
