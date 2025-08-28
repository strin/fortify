import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: { creatorId: string; chatId: string } }
) {
  try {
    const endTimestamp = new Date().getTime();
    const startChat = await prisma.chat.findUnique({
      where: {
        id: parseInt(params.chatId),
      },
    });

    if (!startChat || !startChat.startTime) {
      return NextResponse.json(
        { error: "Chat not found or missing start timestamp" },
        { status: 404 }
      );
    }

    const durationSecs = Math.floor(
      (endTimestamp - startChat.startTime.getTime()) / 1000
    );

    const chat = await prisma.chat.update({
      where: {
        id: parseInt(params.chatId),
      },
      data: {
        endTime: new Date(endTimestamp),
        durationSecs,
      },
    });

    return NextResponse.json(chat);
  } catch (error) {
    console.error("Error closing chat:", error);
    return NextResponse.json(
      { error: "Failed to close chat" },
      { status: 500 }
    );
  }
}
