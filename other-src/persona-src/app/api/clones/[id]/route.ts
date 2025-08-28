import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

// GET a specific clone by ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid clone ID" }, { status: 400 });
    }

    const clone = await prisma.clone.findUnique({
      where: { id },
    });

    if (!clone) {
      return NextResponse.json({ error: "Clone not found" }, { status: 404 });
    }

    return NextResponse.json(clone);
  } catch (error) {
    console.error("Error fetching clone:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// PUT to update a clone
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid clone ID" }, { status: 400 });
    }

    const { name, expectedDurationMs, slug, postId } = await request.json();

    // Check if clone exists
    const existingClone = await prisma.clone.findUnique({
      where: { id },
    });

    if (!existingClone) {
      return NextResponse.json({ error: "Clone not found" }, { status: 404 });
    }

    // Update the clone
    const updatedClone = await prisma.clone.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(expectedDurationMs && { excpetedDurationMs: expectedDurationMs }),
        ...(slug && { slug }),
        ...(postId !== undefined && { postId }),
      },
    });

    return NextResponse.json(updatedClone);
  } catch (error) {
    console.error("Error updating clone:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// DELETE a clone
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid clone ID" }, { status: 400 });
    }

    // Check if clone exists
    const existingClone = await prisma.clone.findUnique({
      where: { id },
    });

    if (!existingClone) {
      return NextResponse.json({ error: "Clone not found" }, { status: 404 });
    }

    // Delete the clone
    await prisma.clone.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting clone:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// PATCH to partially update a clone
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid clone ID" }, { status: 400 });
    }

    const updateData = await request.json();

    // Check if clone exists
    const existingClone = await prisma.clone.findUnique({
      where: { id },
    });

    if (!existingClone) {
      return NextResponse.json({ error: "Clone not found" }, { status: 404 });
    }

    // Update the clone with only the provided fields
    const updatedClone = await prisma.clone.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updatedClone);
  } catch (error) {
    console.error("Error patching clone:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
