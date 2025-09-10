import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/app/api/auth/[...nextauth]/utils";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { fullName, provider = "GITHUB" } = body;

    if (!fullName) {
      return NextResponse.json(
        { error: "Repository full name is required" },
        { status: 400 }
      );
    }

    // Check if repository already exists in any project for this user
    const existingRepository = await prisma.repository.findFirst({
      where: {
        userId: session.user.id,
        provider,
        fullName,
      },
      include: {
        project: true,
      },
    });

    if (existingRepository) {
      return NextResponse.json({
        hasConflict: true,
        conflict: {
          type: "REPOSITORY_EXISTS",
          repository: {
            id: existingRepository.id,
            fullName: existingRepository.fullName,
            description: existingRepository.description,
          },
          existingProject: {
            id: existingRepository.project.id,
            name: existingRepository.project.name,
            description: existingRepository.project.description,
            createdAt: existingRepository.project.createdAt,
          },
        }
      });
    }

    return NextResponse.json({
      hasConflict: false,
    });

  } catch (error) {
    console.error("Error checking repository conflict:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}