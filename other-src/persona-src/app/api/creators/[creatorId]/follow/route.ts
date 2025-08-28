import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options"; // Adjust the import path as needed
import { SessionUser } from "@/types";

export async function PUT(
  req: Request,
  { params }: { params: { creatorId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = session?.user as SessionUser | null;

    const followerId = user?.id;
    const creatorId = parseInt(params.creatorId);

    // Check if already following
    const isFollowing = await prisma.creator.findFirst({
      where: {
        id: creatorId,
        followers: {
          some: {
            id: followerId,
          },
        },
      },
    });

    if (!isFollowing) {
      // Follow
      await prisma.creator.update({
        where: { id: creatorId },
        data: {
          followers: {
            connect: { id: followerId },
          },
        },
      });
      return NextResponse.json({ following: true });
    } else {
      return NextResponse.json({ following: true });
    }
  } catch (error) {
    console.error("Follow error:", error);
    return NextResponse.json(
      { error: "Failed to process follow action" },
      { status: 500 }
    );
  }
}
