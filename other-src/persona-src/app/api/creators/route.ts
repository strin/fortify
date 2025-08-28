export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { updateProfileImageWithSignedUrl } from "@/lib/profile";

interface CreatorUpdateProps {
  bio_description: string;
  display_name: string;
  username: string;
  hide: boolean;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const followerId = searchParams.get("followerId");

    const creators = await prisma.creator.findMany({
      select: {
        id: true,
        username: true,
        display_name: true,
        email: true,
        hide: true,
        Profile: {
          select: {
            profileImage: true,
          },
        },
        followers: {
          select: {
            id: true,
          },
          ...(followerId && {
            where: {
              id: Number(followerId),
            },
          }),
        },
      },
      orderBy: {
        username: "asc",
      },
    });

    console.time("updateProfileImages");
    for (const creator of creators) {
      await updateProfileImageWithSignedUrl(creator.Profile[0]);
    }
    console.timeEnd("updateProfileImages");

    return NextResponse.json(creators);
  } catch (error) {
    console.error("Failed to fetch creators:", error);
    return NextResponse.json(
      { error: "Failed to fetch creators" },
      { status: 500 }
    );
  }
}

export async function PUT(req: any) {
  const body = await req?.json();
  const { id, display_name, username, bio, hide } = body;

  try {
    const updateData: CreatorUpdateProps = {} as CreatorUpdateProps;
    if (display_name !== undefined) updateData.display_name = display_name;
    if (username !== undefined) updateData.username = username;
    if (bio !== undefined) updateData.bio_description = bio;
    // if (hide !== undefined) updateData.hide = hide;
    const creator = await prisma.creator.update({
      where: { id },
      data: updateData,
    });
    return NextResponse.json(creator);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update creator" },
      { status: 500 }
    );
  }
}
