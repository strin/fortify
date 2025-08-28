import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { transformMessage } from "../utils";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = Number(searchParams.get("userId"));
    const creatorId = Number(searchParams.get("creatorId"));

    if (!userId || !creatorId) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const thread = await prisma.thread.findFirst({
      where: {
        userId,
        creatorId,
      },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!thread) {
      // create thread based on userId and creatorId
      const newThread = await prisma.thread.create({
        data: {
          userId,
          creatorId,
        },
      });
      return NextResponse.json(newThread);
    } else {
      return NextResponse.json(thread);
    }
  } catch (error) {
    console.error("Error fetching thread:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
