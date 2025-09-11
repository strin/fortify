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

    const { id } = await params;

    const project = await prisma.project.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        repositories: {
          where: { isActive: true },
          include: {
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
            repoWebhookMappings: {
              where: { provider: "GITHUB" },
              select: {
                id: true,
                webhookId: true,
                createdAt: true,
                lastTriggeredAt: true,
              },
            },
            _count: {
              select: {
                scanTargets: true,
              },
            },
          },
        },
        scanJobs: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            vulnerabilities: {
              select: {
                severity: true,
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

    // Calculate vulnerability summary
    const vulnerabilitySummary = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
      INFO: 0,
    };

    project.scanJobs.forEach((job) => {
      job.vulnerabilities.forEach((vuln) => {
        vulnerabilitySummary[vuln.severity]++;
      });
    });

    // Process repositories to add webhook subscription status
    const processedRepositories = project.repositories.map((repo) => {
      const webhookMapping = repo.repoWebhookMappings?.[0]; // Get the first (should be only one) webhook mapping
      return {
        ...repo,
        webhookSubscribed: !!webhookMapping,
        webhookId: webhookMapping?.webhookId || null,
        webhookCreatedAt: webhookMapping?.createdAt || null,
        webhookLastTriggered: webhookMapping?.lastTriggeredAt || null,
        // Remove the repoWebhookMappings from the response to keep it clean
        repoWebhookMappings: undefined,
      };
    });

    const response = {
      ...project,
      repositories: processedRepositories,
      totalScans: project._count.scanJobs,
      totalRepositories: project._count.repositories,
      vulnerabilitySummary,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, settings } = body;

    // Verify project ownership
    const existingProject = await prisma.project.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingProject) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check if name is already taken (if name is being changed)
    if (name && name !== existingProject.name) {
      const nameExists = await prisma.project.findFirst({
        where: {
          userId: session.user.id,
          name,
          id: { not: id },
        },
      });

      if (nameExists) {
        return NextResponse.json(
          { error: "Project with this name already exists" },
          { status: 409 }
        );
      }
    }

    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(settings && { settings }),
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify project ownership
    const existingProject = await prisma.project.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingProject) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Soft delete - mark as inactive
    await prisma.project.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ message: "Project deleted successfully" });
  } catch (error) {
    console.error("Error deleting project:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
