import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/options";
import prisma from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { creatorId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const profile = await prisma.profile.findFirst({
      where: {
        creatorId: Number(params.creatorId),
      },
      select: {
        profileImage: true,
      },
    });

    if (!profile) {
      return new NextResponse("Creator not found", { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error("[CREATOR_PROFILE_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { creatorId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const { profileImage } = body;

    const profile = await prisma.profile.findFirst({
      where: {
        creatorId: Number(params.creatorId),
      },
    });

    if (!profile) {
      console.log("Profile not found for creatorId", params.creatorId);
      // Find the next available profile ID
      // something wrong with prod we need to manually set id.
      const lastProfile = await prisma.profile.findFirst({
        orderBy: {
          id: "desc",
        },
      });
      const nextId = lastProfile ? lastProfile.id + 1 : 1;
      const newProfile = await prisma.profile.create({
        data: {
          id: nextId,
          creatorId: Number(params.creatorId),
          profileImage,
        },
      });
      return NextResponse.json(newProfile);
    } else {
      const updatedProfile = await prisma.profile.update({
        where: {
          id: profile.id,
        },
        data: {
          profileImage,
        },
        select: {
          profileImage: true,
        },
      });
      return NextResponse.json(updatedProfile);
    }
  } catch (error) {
    console.error("[CREATOR_PROFILE_PATCH]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
