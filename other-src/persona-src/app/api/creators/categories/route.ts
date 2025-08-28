import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const categories = await prisma.creatorCategory.findMany({
      select: {
        id: true,
        name: true,
      },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { name } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: "Category name is required" },
        { status: 400 }
      );
    }

    const existingCategory = await prisma.creatorCategory.findFirst({
      where: {
        name: name,
      },
    });

    if (existingCategory) {
      return NextResponse.json(
        { error: "Category already exists" },
        { status: 409 }
      );
    }

    const category = await prisma.creatorCategory.create({
      data: {
        name,
      },
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    );
  }
}
