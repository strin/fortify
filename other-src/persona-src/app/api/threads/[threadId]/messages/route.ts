import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authOptions } from "../../../auth/[...nextauth]/options";
import { getServerSession } from "next-auth";
import { SpeakerRole } from "@prisma/client";
import { transformMessage } from "../../utils";

export async function POST(
  req: Request,
  { params }: { params: { threadId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { message, role } = await req.json();
    if (!message || typeof message !== "string") {
      return new NextResponse("Invalid message", { status: 400 });
    }

    if (
      !role ||
      typeof role !== "string" ||
      !["user", "assistant"].includes(role)
    ) {
      return new NextResponse("Invalid role", { status: 400 });
    }

    const threadId = parseInt(params.threadId);
    if (isNaN(threadId)) {
      return new NextResponse("Invalid thread ID", { status: 400 });
    }

    const updatedThread = await prisma.$transaction(async (tx) => {
      const newMessage = await tx.threadTextMessage.create({
        data: {
          content: message,
          role: role === "user" ? SpeakerRole.USER : SpeakerRole.ASSISTANT,
          threadId,
        },
      });

      const thread = await tx.thread.findUnique({
        where: { id: threadId },
        include: {
          threadTextMessages: {
            orderBy: {
              createdAt: "asc",
            },
            select: {
              id: true,
              threadId: true,
              role: true,
              content: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          threadCallMessages: {
            select: {
              id: true,
              threadId: true,
              createdAt: true,
              updatedAt: true,
              chat: {
                select: {
                  durationSecs: true,
                },
              },
            },
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      });

      if (!thread) {
        throw new Error("Thread not found");
      }

      return thread;
    });

    const formattedThread = {
      ...updatedThread,
      threadTextMessages:
        updatedThread.threadTextMessages.map(transformMessage),
    };

    return NextResponse.json(formattedThread);
  } catch (error) {
    console.error("Error creating message:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
