import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";

// GET all slide decks for a creator
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const creatorId = searchParams.get("creatorId");

  if (!creatorId) {
    return NextResponse.json(
      { error: "Creator ID is required" },
      { status: 400 }
    );
  }

  try {
    const slideDecks = await prisma.slideDeck.findMany({
      where: {
        creatorId: parseInt(creatorId),
      },
      include: {
        DeckImageSlide: true,
      },
    });

    return NextResponse.json(slideDecks);
  } catch (error) {
    console.error("Error fetching slide decks:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST to create a new slide deck
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await request.json();
  const { creatorId, title } = data;

  if (!creatorId) {
    return NextResponse.json(
      { error: "Creator ID is required" },
      { status: 400 }
    );
  }

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  try {
    const slideDeck = await prisma.slideDeck.create({
      data: {
        creatorId: parseInt(creatorId),
        title: title,
      },
    });

    return NextResponse.json(slideDeck);
  } catch (error) {
    console.error("Error creating slide deck:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
