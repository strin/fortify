import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { prompt, creatorId, welcomeMessage } = await req.json();

  if (prompt === undefined || creatorId === undefined) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  try {
    const updatedPrompt = await prisma.prompt.create({
      data: {
        content: prompt,
        creatorId: creatorId,
        welcomeMessage: welcomeMessage,
      },
    });

    return NextResponse.json(updatedPrompt, { status: 200 });
  } catch (error) {
    console.error("Error creating prompt:", error);
    return NextResponse.json(
      { error: "Failed to create prompt" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const creatorId = url.searchParams.get("creatorId");

  if (!creatorId) {
    return NextResponse.json({ error: "Missing creatorId" }, { status: 400 });
  }

  try {
    const prompts = await prisma.prompt.findMany({
      where: {
        creatorId: parseInt(creatorId),
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(prompts);
  } catch (error) {
    console.error("Error fetching prompts:", error);
    return NextResponse.json(
      { error: "Failed to fetch prompts" },
      { status: 500 }
    );
  }
}
