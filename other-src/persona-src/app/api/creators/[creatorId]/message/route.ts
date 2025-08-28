import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { SpeakerRole } from "@prisma/client";

export async function POST(
  request: Request,
  { params }: { params: { creatorId: string } }
) {
  try {
    const { content, role, chatId, startTimestamp, endTimestamp } =
      await request.json();
    const creatorId = parseInt(params.creatorId);

    if (!["user", "assistant", "system"].includes(role.toLowerCase())) {
      return NextResponse.json(
        { error: "Invalid role. Must be 'user', 'assistant', or 'system'" },
        { status: 400 }
      );
    }

    const message = await prisma.message.create({
      data: {
        content,
        role: role.toUpperCase() as SpeakerRole,
        chatId,
        creatorId,
        startTime: new Date(startTimestamp),
        endTime: new Date(endTimestamp),
      },
    });

    return NextResponse.json(message);
  } catch (error) {
    console.error("Error creating message:", error);
    return NextResponse.json(
      { error: "Failed to create message" },
      { status: 500 }
    );
  }
}
