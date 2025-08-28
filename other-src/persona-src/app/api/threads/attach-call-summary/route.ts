import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { userId, creatorId, chatId } = await req.json();

    if (!userId || !creatorId) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Find existing thread or create new one
    let thread = await prisma.thread.findFirst({
      where: {
        userId,
        creatorId,
      },
    });

    if (!thread) {
      // Create new thread if none exists
      thread = await prisma.thread.create({
        data: {
          userId,
          creatorId,
        },
      });
    }

    // Update thread's call message
    const callMessage = await prisma.threadCallMessage.create({
      data: {
        threadId: thread.id,
        chatId,
      },
    });

    return NextResponse.json(callMessage);
  } catch (error) {
    console.error("Error in attach-call-summary:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
