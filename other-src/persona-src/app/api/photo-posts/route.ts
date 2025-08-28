import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PUT(request: Request) {
  const data = await request.json();
  const { imageUrls, caption, creatorId } = data;

  if (!imageUrls || !caption || !creatorId) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  try {
    const photoPost = await prisma.photoPost.create({
      data: {
        imageUrls,
        caption,
        creatorId: parseInt(creatorId),
      },
    });

    return NextResponse.json(photoPost);
  } catch (error) {
    console.error("Error creating photo post:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

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
    const posts = await prisma.photoPost.findMany({
      where: {
        creatorId: parseInt(creatorId),
      },
      select: {
        id: true,
        imageUrls: true,
        caption: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    console.log("posts", posts);

    return NextResponse.json(posts);
  } catch (error) {
    console.error("Error fetching posts:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
