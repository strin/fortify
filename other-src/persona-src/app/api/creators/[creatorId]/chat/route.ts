import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: { creatorId: string } }
) {
  try {
    const body = await request.json();
    const { messages, userId, postId } = body;

    const createdAt = new Date();

    const chat = await prisma.chat.create({
      data: {
        creatorId: parseInt(params.creatorId),
        messages: {
          create: messages || [],
        },
        userId: userId,
        createdAt,
        startTime: createdAt,
        postId,
      },
    });

    return NextResponse.json(chat);
  } catch (error) {
    console.error("Error creating chat:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
