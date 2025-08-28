import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/options";
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

    const creator = await prisma.creator.findUnique({
      where: {
        id: Number(params.creatorId),
      },
      include: {
        Profile: true,
      },
    });

    if (!creator) {
      return new NextResponse("Creator not found", { status: 404 });
    }

    return NextResponse.json(creator);
  } catch (error) {
    console.error("[CREATOR_GET]", error);
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

    const creator = await prisma.creator.update({
      where: {
        id: Number(params.creatorId),
      },
      data: {
        ...body,
      },
    });

    return NextResponse.json(creator);
  } catch (error) {
    console.error("[CREATOR_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
