import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/options";
import { SessionUser } from "@/types";
import { transformMessage } from "../utils";

export async function GET(
  request: Request,
  { params }: { params: { threadId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number((session.user as SessionUser).id);
    const threadId = Number(params.threadId);

    if (isNaN(threadId)) {
      return NextResponse.json({ error: "Invalid thread ID" }, { status: 400 });
    }

    const thread = await prisma.thread.findFirst({
      where: {
        id: threadId,
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            display_name: true,
            Profile: {
              select: {
                profileImage: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            username: true,
            display_name: true,
          },
        },
        threadTextMessages: {
          orderBy: {
            createdAt: "desc",
          },
        },
        threadCallMessages: {
          orderBy: {
            createdAt: "desc",
          },
          select: {
            id: true,
            threadId: true,
            createdAt: true,
            updatedAt: true,
            chat: {
              select: {
                durationSecs: true,
                summary: true,
              },
            },
          },
        },
      },
    });

    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    const formattedThread = {
      id: thread.id,
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt,
      threadTextMessages: thread.threadTextMessages.map(transformMessage),
      threadCallMessages: thread.threadCallMessages,
      creator: thread.creator,
      user: thread.user,
    };

    return NextResponse.json(formattedThread);
  } catch (error) {
    console.error("Error fetching thread:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
