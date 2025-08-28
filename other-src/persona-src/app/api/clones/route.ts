import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

// GET all clones for a creator
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const creatorId = searchParams.get("creatorId");

  if (!creatorId) {
    return NextResponse.json(
      { error: "Creator ID is required" },
      { status: 400 }
    );
  }

  try {
    const clones = await prisma.clone.findMany({
      where: {
        creatorId: parseInt(creatorId),
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(clones);
  } catch (error) {
    console.error("Error fetching clones:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST a new clone
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, expectedDurationMs, slug, creatorId } = await request.json();

    if (!name || !expectedDurationMs || !creatorId) {
      return NextResponse.json(
        { error: "Name, expected duration, and creator ID are required" },
        { status: 400 }
      );
    }

    // Generate slug if not provided
    const finalSlug = slug || name.toLowerCase().replace(/\s+/g, "-");

    const newClone = await prisma.clone.create({
      data: {
        name,
        excpetedDurationMs: expectedDurationMs, // Note: There's a typo in the schema field name
        slug: finalSlug,
        creator: {
          connect: {
            id: creatorId,
          },
        },
      },
    });

    return NextResponse.json(newClone, { status: 201 });
  } catch (error) {
    console.error("Error creating clone:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
