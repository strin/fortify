import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSignedUrl } from "@/lib/supabase";
import { updateCoverImageUrls } from "../utils";

export async function GET(
  request: Request,
  { params }: { params: { postId: string } }
) {
  const postId = params.postId;

  if (!postId) {
    return NextResponse.json({ error: "Post ID is required" }, { status: 400 });
  }

  try {
    const post = await prisma.post.findUnique({
      where: {
        id: parseInt(postId),
      },
      select: {
        id: true,
        title: true,
        summary: true,
        overview: true,
        createdAt: true,
        updatedAt: true,
        coverImages: true,
        creator: {
          select: {
            id: true,
            username: true,
          },
        },
        prompt: {
          select: {
            id: true,
            welcomeMessage: true,
          },
        },
      },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    await updateCoverImageUrls(post as any);

    return NextResponse.json(post);
  } catch (error) {
    console.error("Error fetching post:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { postId: string } }
) {
  const postId = params.postId;

  if (!postId) {
    return NextResponse.json({ error: "Post ID is required" }, { status: 400 });
  }

  try {
    const { title, summary, overview, coverImages, promptId } =
      await request.json();

    const post = await prisma.post.update({
      where: {
        id: parseInt(postId),
      },
      data: {
        title,
        summary,
        overview,
        coverImages,
        promptId,
      },
    });

    await updateCoverImageUrls(post as any);

    return NextResponse.json(post);
  } catch (error) {
    console.error("Error updating post:", error);
    return NextResponse.json(
      { error: "Failed to update post" },
      { status: 500 }
    );
  }
}
