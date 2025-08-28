import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
// or alternatively: export const revalidate = 0;

export async function GET() {
  try {
    const chats = await prisma.chat.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    // Transform the data to match our frontend model
    const meetings = chats.map((chat) => {
      // Calculate duration based on first and last message timestamps
      const duration = chat.durationSecs;

      return {
        id: chat.id,
        title: chat.title || "Untitled Meeting",
        summary: chat.summary || "No summary available",
        createdAt: chat.createdAt.toISOString(),
        updatedAt: chat.updatedAt.toISOString(),
        duration,
        participants: [],
      };
    });

    return NextResponse.json(meetings);
  } catch (error) {
    console.error("Error fetching meetings:", error);
    return NextResponse.json(
      { error: "Failed to fetch meetings" },
      { status: 500 }
    );
  }
}
