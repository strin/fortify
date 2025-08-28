import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const {
      audioUrl,
      transcript,
      creatorId,
      duration,
      public: isPublic,
    } = await request.json();

    if (!audioUrl || !creatorId || duration === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const voiceNote = await prisma.voiceNote.create({
      data: {
        audioUrl,
        transcript,
        creatorId,
        duration,
        public: isPublic || false,
      },
    });

    return NextResponse.json(voiceNote, { status: 201 });
  } catch (error) {
    console.error("Error creating voice note:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const creatorId = searchParams.get("creatorId");
    const publicOnly = searchParams.get("publicOnly") === "true";

    if (!creatorId) {
      return NextResponse.json(
        { error: "Missing creatorId parameter" },
        { status: 400 }
      );
    }

    const whereClause = publicOnly
      ? {
          creatorId: parseInt(creatorId),
          public: true,
        }
      : {
          creatorId: parseInt(creatorId),
        };

    const recentNotes = await prisma.voiceNote.findMany({
      where: whereClause,
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(recentNotes, { status: 200 });
  } catch (error) {
    console.error("Error retrieving recent voice notes:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
