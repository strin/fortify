import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/options";

// PATCH to update a clone's slide deck
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;
  const data = await request.json();
  const { slideDeckId } = data;

  if (!slideDeckId) {
    return NextResponse.json(
      { error: "Slide deck ID is required" },
      { status: 400 }
    );
  }

  try {
    const clone = await prisma.clone.update({
      where: {
        id: parseInt(id),
      },
      data: {
        slideDeckId: parseInt(slideDeckId),
      },
      include: {
        slideDeck: {
          include: {
            DeckImageSlide: true,
          },
        },
      },
    });

    return NextResponse.json(clone);
  } catch (error) {
    console.error("Error updating clone slide deck:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// GET a clone's slide deck
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
    const clone = await prisma.clone.findUnique({
      where: {
        id: parseInt(id),
      },
      include: {
        slideDeck: {
          include: {
            DeckImageSlide: {
              orderBy: {
                id: "asc",
              },
            },
          },
        },
      },
    });

    if (!clone) {
      return NextResponse.json({ error: "Clone not found" }, { status: 404 });
    }

    return NextResponse.json(clone.slideDeck);
  } catch (error) {
    console.error("Error fetching clone slide deck:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
