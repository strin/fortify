import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/app/api/auth/[...nextauth]/utils";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

    // Verify the project exists and user has access
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: session.user.id,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Get all scans for this project
    const scans = await prisma.scanJob.findMany({
      where: {
        projectId: projectId,
        userId: session.user.id,
      },
      include: {
        vulnerabilities: {
          select: {
            id: true,
            severity: true,
            category: true,
          },
        },
        scanTarget: {
          select: {
            id: true,
            name: true,
            repoUrl: true,
            branch: true,
            subPath: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Process scans to include summary statistics
    const processedScans = scans.map((scan) => {
      const vulnerabilityCounts = {
        CRITICAL: 0,
        HIGH: 0,
        MEDIUM: 0,
        LOW: 0,
        INFO: 0,
      };

      const categoryCounts: Record<string, number> = {};

      scan.vulnerabilities.forEach((vuln) => {
        vulnerabilityCounts[
          vuln.severity as keyof typeof vulnerabilityCounts
        ]++;
        categoryCounts[vuln.category] =
          (categoryCounts[vuln.category] || 0) + 1;
      });

      return {
        id: scan.id,
        type: scan.type,
        status: scan.status,
        createdAt: scan.createdAt,
        updatedAt: scan.updatedAt,
        startedAt: scan.startedAt,
        finishedAt: scan.finishedAt,
        vulnerabilitiesFound: scan.vulnerabilitiesFound,
        error: scan.error,
        data: scan.data,
        vulnerabilityCounts,
        categoryCounts,
        totalVulnerabilities: scan.vulnerabilities.length,
        scanTarget: scan.scanTarget,
      };
    });

    return NextResponse.json({
      scans: processedScans,
      totalScans: processedScans.length,
    });
  } catch (error) {
    console.error("Error fetching project scans:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;
    const body = await request.json();
    const { repositoryId, branch, path, repoUrl } = body;

    if (!repositoryId || !branch || !repoUrl) {
      return NextResponse.json(
        { error: "Missing required fields: repositoryId, branch, repoUrl" },
        { status: 400 }
      );
    }

    // Verify the project exists and user has access
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: session.user.id,
      },
      include: {
        repositories: {
          where: {
            id: repositoryId,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.repositories.length === 0) {
      return NextResponse.json(
        {
          error: "Repository not found in project",
        },
        { status: 404 }
      );
    }

    const repository = project.repositories[0];

    // Keep the path as-is, default to "/" if not provided
    const normalizedPath = path || "/";

    // Create or find existing scan target
    const scanTarget = await prisma.scanTarget.upsert({
      where: {
        userId_repoUrl_branch_subPath: {
          userId: session.user.id,
          repoUrl: repoUrl,
          branch: branch,
          subPath: normalizedPath,
        },
      },
      create: {
        userId: session.user.id,
        repositoryId: repository.id,
        name: `${repository.fullName} (${branch}${
          normalizedPath !== "/" ? normalizedPath : ""
        })`,
        description: `Scan target for ${
          repository.fullName
        } on branch ${branch}${
          normalizedPath !== "/" ? ` at path ${normalizedPath}` : ""
        }`,
        repoUrl: repoUrl,
        branch: branch,
        subPath: normalizedPath,
      },
      update: {
        // Update last scan time will be set when scan completes
      },
    });

    // Submit job to scan agent (which will create database record and queue job)
    const scanWorkerUrl = process.env.SCAN_AGENT_URL || "http://localhost:8000";

    try {
      const workerResponse = await fetch(`${scanWorkerUrl}/scan/repo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          repo_url: repoUrl,
          branch: branch,
          claude_cli_args: null,
          scan_options:
            normalizedPath === "/" ? {} : { sub_path: normalizedPath },
          user_id: session.user.id,
          project_id: projectId,
          scan_target_id: scanTarget.id,
        }),
      });

      if (!workerResponse.ok) {
        const errorText = await workerResponse.text();
        console.error("Failed to submit job to worker:", errorText);
        return NextResponse.json(
          { error: "Failed to start scan job" },
          { status: 500 }
        );
      }

      const workerResult = await workerResponse.json();
      console.log("Worker response:", workerResult);

      return NextResponse.json({
        scanJobId: workerResult.job_id,
        scanTargetId: scanTarget.id,
        message: "Scan job created successfully",
      });
    } catch (workerError) {
      console.error("Error submitting to scan worker:", workerError);

      return NextResponse.json(
        { error: "Failed to start scan job" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error creating scan:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
