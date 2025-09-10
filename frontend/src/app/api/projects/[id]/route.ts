import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/app/api/auth/[...nextauth]/utils";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const project = await prisma.project.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        repositories: {
          include: {
            scanTargets: {
              select: {
                id: true,
                name: true,
                branch: true,
                subPath: true,
              },
            },
          },
        },
        scanJobs: {
          orderBy: { createdAt: "desc" },
          include: {
            vulnerabilities: {
              select: {
                severity: true,
              },
            },
            scanTarget: {
              select: {
                name: true,
                repoUrl: true,
                branch: true,
              },
            },
          },
        },
        _count: {
          select: {
            scanJobs: true,
            repositories: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Calculate comprehensive vulnerability stats from all scans
    let vulnerabilityStats = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
      total: 0,
    };

    // Get vulnerability stats from the most recent completed scan
    const recentCompletedScan = project.scanJobs.find(
      (scan) => scan.status === "COMPLETED"
    );

    if (recentCompletedScan?.vulnerabilities) {
      const severityCounts = recentCompletedScan.vulnerabilities.reduce(
        (acc: any, vuln) => {
          const severity = vuln.severity.toLowerCase() as keyof typeof acc;
          if (severity in acc && severity !== "total") {
            acc[severity]++;
          }
          acc.total++;
          return acc;
        },
        { critical: 0, high: 0, medium: 0, low: 0, info: 0, total: 0 }
      );
      vulnerabilityStats = severityCounts;
    }

    // Calculate scan status counts
    const scanStats = {
      total: project._count.scanJobs,
      completed: project.scanJobs.filter((scan) => scan.status === "COMPLETED")
        .length,
      failed: project.scanJobs.filter((scan) => scan.status === "FAILED")
        .length,
      pending: project.scanJobs.filter((scan) => scan.status === "PENDING")
        .length,
      inProgress: project.scanJobs.filter(
        (scan) => scan.status === "IN_PROGRESS"
      ).length,
    };

    // Transform scan jobs for frontend consumption
    const transformedScanJobs = project.scanJobs.map((scan) => {
      const vulnerabilityCounts = scan.vulnerabilities?.reduce(
        (acc: any, vuln) => {
          const severity = vuln.severity.toLowerCase();
          if (severity in acc) {
            acc[severity]++;
          }
          return acc;
        },
        { critical: 0, high: 0, medium: 0, low: 0, info: 0 }
      ) || { critical: 0, high: 0, medium: 0, low: 0, info: 0 };

      return {
        id: scan.id,
        status: scan.status,
        createdAt: scan.createdAt,
        startedAt: scan.startedAt,
        finishedAt: scan.finishedAt,
        vulnerabilitiesFound: scan.vulnerabilitiesFound,
        vulnerabilityCounts,
        scanTarget: scan.scanTarget,
      };
    });

    const transformedProject = {
      ...project,
      vulnerabilityStats,
      scanStats,
      totalRepositories: project._count.repositories,
      scanJobs: transformedScanJobs,
    };

    return NextResponse.json(transformedProject);
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, isActive, settings } = body;

    // Check if project exists and belongs to user
    const existingProject = await prisma.project.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingProject) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // If name is being changed, check for conflicts
    if (name && name.trim() !== existingProject.name) {
      const nameConflict = await prisma.project.findFirst({
        where: {
          userId: session.user.id,
          name: name.trim(),
          id: { not: id },
        },
      });

      if (nameConflict) {
        return NextResponse.json(
          { error: "Project with this name already exists" },
          { status: 409 }
        );
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined)
      updateData.description = description?.trim() || null;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (settings !== undefined) updateData.settings = settings;

    const updatedProject = await prisma.project.update({
      where: { id },
      data: updateData,
      include: {
        repositories: true,
        _count: {
          select: {
            scanJobs: true,
            repositories: true,
          },
        },
      },
    });

    return NextResponse.json(updatedProject);
  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if project exists and belongs to user
    const existingProject = await prisma.project.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingProject) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Delete the project (this will cascade to related records)
    await prisma.project.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting project:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}