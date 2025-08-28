import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { creatorId: string } }
) {
  try {
    const creatorId = parseInt(params.creatorId);

    const creator = await prisma.creator.findUnique({
      where: { id: creatorId },
      include: {
        categories: true,
      },
    });

    if (!creator) {
      return NextResponse.json({ error: "Creator not found" }, { status: 404 });
    }

    const categories = creator.categories.map((category) => ({
      id: category.id.toString(),
      name: category.name,
    }));

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error fetching creator categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { creatorId: string } }
) {
  try {
    const creatorId = parseInt(params.creatorId);
    const { categoryIds } = await request.json();

    if (!Array.isArray(categoryIds)) {
      return NextResponse.json(
        { error: "names must be an array" },
        { status: 400 }
      );
    }

    const creator = await prisma.creator.update({
      where: { id: creatorId },
      data: {
        categories: {
          set: categoryIds.map((id) => ({ id: parseInt(id) })),
        },
      },
      include: {
        categories: true,
      },
    });

    const categories = creator.categories.map((category) => ({
      value: category.id.toString(),
      label: category.name,
    }));

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error updating creator categories:", error);
    return NextResponse.json(
      { error: "Failed to update categories" },
      { status: 500 }
    );
  }
}
