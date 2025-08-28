import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { updateCoverImageUrls } from "./utils";

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
    const posts = await prisma.post.findMany({
      where: {
        creatorId: parseInt(creatorId),
      },
      select: {
        id: true,
        title: true,
        summary: true,
        overview: true,
        createdAt: true,
        updatedAt: true,
        coverImages: true,
        prompt: {
          select: {
            id: true,
            welcomeMessage: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    for (const post of posts) {
      await updateCoverImageUrls(post as any);
    }

    return NextResponse.json(posts);
  } catch (error) {
    console.error("Error fetching posts:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { title, summary, promptId, creatorId, overview } = await req.json();

    if (!title || !creatorId || summary === null || overview === null) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const post = await prisma.post.create({
      data: {
        title,
        summary,
        promptId: promptId ? parseInt(promptId) : null,
        creatorId: parseInt(creatorId),
        overview,
      },
    });

    await updateCoverImageUrls(post);

    return NextResponse.json(post);
  } catch (error) {
    console.error("Error creating post:", error);
    return NextResponse.json(
      { error: "Failed to create post" },
      { status: 500 }
    );
  }
}
