import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/options";

// GET a specific slide deck by ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = params.id;

  try {
    const slideDeck = await prisma.slideDeck.findUnique({
      where: {
        id: parseInt(id),
      },
      include: {
        DeckImageSlide: {
          orderBy: {
            order: "asc",
          },
        },
        DeckMarkdownSlide: {
          orderBy: {
            order: "asc",
          },
        },
      },
    });

    if (!slideDeck) {
      return NextResponse.json(
        { error: "Slide deck not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(slideDeck);
  } catch (error) {
    console.error("Error fetching slide deck:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// PATCH to update a slide deck
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = params.id;
  // Note: Currently there are no fields to update on SlideDeck besides relations
  // This endpoint is included for future extensibility

  try {
    const slideDeck = await prisma.slideDeck.update({
      where: {
        id: parseInt(id),
      },
      data: {},
      include: {
        DeckImageSlide: true,
      },
    });

    return NextResponse.json(slideDeck);
  } catch (error) {
    console.error("Error updating slide deck:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// DELETE a slide deck
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = params.id;

  try {
    // First delete all associated slides
    await prisma.deckImageSlide.deleteMany({
      where: {
        slideDeckId: parseInt(id),
      },
    });

    // Then delete the slide deck
    const slideDeck = await prisma.slideDeck.delete({
      where: {
        id: parseInt(id),
      },
    });

    return NextResponse.json(slideDeck);
  } catch (error) {
    console.error("Error deleting slide deck:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
