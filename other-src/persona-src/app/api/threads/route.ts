export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";
import { SessionUser } from "@/types";
import { transformMessage } from "./utils";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number((session.user as SessionUser).id);
    console.log("thread userId", userId);

    const threads = await prisma.thread.findMany({
      where: {
        userId,
      },
      orderBy: {
        updatedAt: "desc",
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            display_name: true,
            categories: {
              select: {
                name: true,
              },
            },
            Profile: {
              select: {
                profileImage: true,
              },
            },
          },
        },
        threadTextMessages: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
        threadCallMessages: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
          select: {
            createdAt: true,
            updatedAt: true,
            chat: {
              select: {
                durationSecs: true,
              },
            },
          },
        },
      },
    });

    const formattedThreads = threads.map((thread) => ({
      id: thread.id,
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt,
      latestTextMessage: transformMessage(thread.threadTextMessages[0]),
      latestCallMessage: thread.threadCallMessages[0] || null,
      creator: thread.creator,
    }));

    return NextResponse.json(formattedThreads);
  } catch (error) {
    console.error("Error fetching threads:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { userId, creatorId } = await req.json();

    if (!userId || !creatorId) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const thread = await prisma.thread.create({
      data: {
        userId,
        creatorId,
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
        },
      },
    });

    return NextResponse.json(thread);
  } catch (error) {
    console.error("Error creating thread:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
