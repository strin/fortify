import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";

// POST to create a new slide
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await request.json();
  const { slideDeckId, imageUrl } = data;

  if (!slideDeckId || !imageUrl) {
    return NextResponse.json(
      { error: "Slide deck ID and image URL are required" },
      { status: 400 }
    );
  }

  try {
    const slide = await prisma.deckImageSlide.create({
      data: {
        slideDeckId: parseInt(slideDeckId),
        imageUrl,
        order: 0,
      },
    });

    return NextResponse.json(slide);
  } catch (error) {
    console.error("Error creating slide:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// GET all slides for a specific slide deck
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const slideDeckId = searchParams.get("slideDeckId");

  if (!slideDeckId) {
    return NextResponse.json(
      { error: "Slide deck ID is required" },
      { status: 400 }
    );
  }

  try {
    const slides = await prisma.deckImageSlide.findMany({
      where: {
        slideDeckId: parseInt(slideDeckId),
      },
      orderBy: {
        id: "asc",
      },
    });

    return NextResponse.json(slides);
  } catch (error) {
    console.error("Error fetching slides:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
