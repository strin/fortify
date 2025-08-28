import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug;
    if (!slug) {
      return NextResponse.json({ error: "Slug is required" }, { status: 400 });
    }

    const slideDeck = await prisma.slideDeck.findUnique({
      where: { slug },
    });

    if (!slideDeck) {
      return NextResponse.json(
        { error: "Slide deck not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(slideDeck);
  } catch (error) {
    console.error("Error fetching slide deck by slug:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
