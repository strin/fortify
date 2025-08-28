import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// TODO: consolidate this with the creators/[creatorId]/profile/route.ts

export async function PUT(request: Request) {
  const { id, profileImage } = await request.json();

  if (!id) {
    return NextResponse.json(
      { error: "Invalid request. Missing required fields." },
      { status: 400 }
    );
  }

  try {
    const updatedProfile = await prisma.profile.update({
      where: { id },
      data: {
        ...(profileImage && { profileImage }),
      },
    });

    return NextResponse.json(updatedProfile);
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const data = await request.json();
  try {
    // Find the latest profile to determine next ID
    const lastProfile = await prisma.profile.findFirst({
      orderBy: {
        id: "desc",
      },
    });
    const nextId = lastProfile ? lastProfile.id + 1 : 1;

    // Create new profile with manually set ID
    const createdProfile = await prisma.profile.create({
      data: {
        ...data,
        id: nextId,
      },
    });

    return NextResponse.json({
      data: createdProfile,
      status: true,
    });
  } catch (error) {
    console.error("Error creating profile:", error);
    return NextResponse.json(
      { error: "Failed to create profile." },
      { status: 500 }
    );
  }
}
