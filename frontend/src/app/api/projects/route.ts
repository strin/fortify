import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/app/api/auth/[...nextauth]/utils";

export async function GET() {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const projects = await prisma.project.findMany({
      where: {
        userId: session.user.id,
        isActive: true,
      },
      include: {
        repositories: {
          where: { isActive: true },
          select: {
            id: true,
            fullName: true,
            description: true,
            provider: true,
            defaultBranch: true,
            isPrivate: true,
            lastScanAt: true,
          },
        },
        scanJobs: {
          select: { id: true },
        },
        _count: {
          select: {
            scanJobs: true,
            repositories: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const formattedProjects = projects.map((project) => ({
      ...project,
      totalScans: project._count.scanJobs,
      totalRepositories: project._count.repositories,
    }));

    return NextResponse.json({ projects: formattedProjects });
  } catch (error) {
    console.error("Error fetching projects:", error);
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
      name,
      description,
      repository: {
        fullName,
        description: repoDescription,
        repoUrl,
        defaultBranch = "main",
        isPrivate = false,
        externalId,
        provider = "GITHUB",
      },
    } = body;

    if (!name || !fullName || !repoUrl) {
      return NextResponse.json(
        { error: "Project name, repository full name, and repository URL are required" },
        { status: 400 }
      );
    }

    // Check if project already exists for this user
    const existingProject = await prisma.project.findFirst({
      where: {
        userId: session.user.id,
        name,
      },
    });

    if (existingProject) {
      return NextResponse.json(
        { error: "Project with this name already exists" },
        { status: 409 }
      );
    }

    // Check if repository already exists in any project for this user
    const existingRepository = await prisma.repository.findFirst({
      where: {
        userId: session.user.id,
        provider,
        fullName,
      },
    });

    if (existingRepository) {
      return NextResponse.json(
        { error: "Repository already exists in another project" },
        { status: 409 }
      );
    }

    // Create project with repository in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the project
      const project = await tx.project.create({
        data: {
          userId: session.user.id,
          name,
          description,
          settings: {
            autoScanOnPR: false,
            notifications: {
              slack: null,
              email: true,
            },
          },
        },
      });

      // Create the repository
      const repository = await tx.repository.create({
        data: {
          projectId: project.id,
          userId: session.user.id,
          fullName,
          description: repoDescription,
          provider,
          repoUrl,
          externalId,
          defaultBranch,
          isPrivate,
          providerMetadata: {},
        },
      });

      // Also create a default scan target for the main/default branch
      await tx.scanTarget.create({
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

      return { project, repository };
    });

    return NextResponse.json(
      {
        id: result.project.id,
        name: result.project.name,
        description: result.project.description,
        repository: {
          id: result.repository.id,
          fullName: result.repository.fullName,
          description: result.repository.description,
          repoUrl: result.repository.repoUrl,
          defaultBranch: result.repository.defaultBranch,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}