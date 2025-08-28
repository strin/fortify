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

    const clone = await prisma.clone.findUnique({
      where: { slug },
    });

    if (!clone) {
      return NextResponse.json({ error: "Clone not found" }, { status: 404 });
    }

    return NextResponse.json(clone);
  } catch (error) {
    console.error("Error fetching clone by slug:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
