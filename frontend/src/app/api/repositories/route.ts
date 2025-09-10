import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/app/api/auth/[...nextauth]/utils";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    const whereClause = {
      userId: session.user.id,
      isActive: true,
      ...(projectId && { projectId }),
    };

    const repositories = await prisma.repository.findMany({
      where: whereClause,
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        scanTargets: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            branch: true,
            subPath: true,
            lastScanAt: true,
          },
        },
        _count: {
          select: {
            scanTargets: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const formattedRepositories = repositories.map((repo) => ({
      ...repo,
      totalScanTargets: repo._count.scanTargets,
    }));

    return NextResponse.json({ repositories: formattedRepositories });
  } catch (error) {
    console.error("Error fetching repositories:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      projectId,
      fullName,
      description,
      repoUrl,
      defaultBranch = "main",
      isPrivate = false,
      externalId,
      provider = "GITHUB",
      providerMetadata = {},
    } = body;

    if (!projectId || !fullName || !repoUrl) {
      return NextResponse.json(
        { error: "Project ID, repository full name, and repository URL are required" },
        { status: 400 }
      );
    }

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: session.user.id,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Check if repository already exists in this project
    const existingRepository = await prisma.repository.findFirst({
      where: {
        projectId,
        provider,
        fullName,
      },
    });

    if (existingRepository) {
      return NextResponse.json(
        { error: "Repository already exists in this project" },
        { status: 409 }
      );
    }

    // Create repository and default scan target in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const repository = await tx.repository.create({
        data: {
          projectId,
          userId: session.user.id,
          fullName,
          description,
          provider,
          repoUrl,
          externalId,
          defaultBranch,
          isPrivate,
          providerMetadata,
        },
      });

      // Create a default scan target for the main/default branch
      const scanTarget = await tx.scanTarget.create({
        data: {
          userId: session.user.id,
          repositoryId: repository.id,
          name: `${fullName} (${defaultBranch})`,
          description: `Default scan target for ${fullName} on ${defaultBranch} branch`,
          repoUrl,
          branch: defaultBranch,
          subPath: null,
        },
      });

      return { repository, scanTarget };
    });

    return NextResponse.json(
      {
        id: result.repository.id,
        fullName: result.repository.fullName,
        description: result.repository.description,
        repoUrl: result.repository.repoUrl,
        defaultBranch: result.repository.defaultBranch,
        defaultScanTarget: {
          id: result.scanTarget.id,
          name: result.scanTarget.name,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating repository:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}