import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/app/api/auth/[...nextauth]/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;

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

    const repositories = await prisma.repository.findMany({
      where: {
        projectId,
        isActive: true,
      },
      include: {
        scanTargets: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            branch: true,
            subPath: true,
            lastScanAt: true,
            scanJobs: {
              orderBy: { createdAt: "desc" },
              take: 1,
              select: {
                id: true,
                status: true,
                vulnerabilitiesFound: true,
                finishedAt: true,
              },
            },
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
    console.error("Error fetching project repositories:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}