import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/app/api/auth/[...nextauth]/utils";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
      return NextResponse.json({ 
        error: "Repository not found in project" 
      }, { status: 404 });
    }

    const repository = project.repositories[0];

    // Normalize the path - use empty string for root directory instead of null
    const normalizedPath = (path && path !== '/') ? path : '';

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
        name: `${repository.fullName} (${branch}${normalizedPath ? normalizedPath : ''})`,
        description: `Scan target for ${repository.fullName} on branch ${branch}${normalizedPath ? ` at path ${normalizedPath}` : ''}`,
        repoUrl: repoUrl,
        branch: branch,
        subPath: normalizedPath,
      },
      update: {
        // Update last scan time will be set when scan completes
      },
    });

    // Create the scan job
    const scanJobData = {
      repo_url: repoUrl,
      branch: branch,
      path: normalizedPath || undefined, // Use undefined for root directory in scan job data
      user_id: session.user.id,
    };

    const scanJob = await prisma.scanJob.create({
      data: {
        userId: session.user.id,
        projectId: projectId,
        scanTargetId: scanTarget.id,
        type: "SCAN_REPO",
        status: "PENDING",
        data: scanJobData,
      },
    });

    // Submit job to scan worker
    const scanWorkerUrl = process.env.SCAN_WORKER_URL || "http://localhost:8000";
    
    try {
      const workerResponse = await fetch(`${scanWorkerUrl}/submit-job`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          job_id: scanJob.id,
          job_type: "SCAN_REPO",
          job_data: scanJobData,
        }),
      });

      if (!workerResponse.ok) {
        console.error("Failed to submit job to worker:", await workerResponse.text());
        // Update job status to failed
        await prisma.scanJob.update({
          where: { id: scanJob.id },
          data: {
            status: "FAILED",
            error: "Failed to submit job to scan worker",
          },
        });

        return NextResponse.json(
          { error: "Failed to start scan job" },
          { status: 500 }
        );
      }

      // Update job status to pending (worker received it)
      await prisma.scanJob.update({
        where: { id: scanJob.id },
        data: {
          status: "PENDING",
          startedAt: new Date(),
        },
      });

      return NextResponse.json({
        scanJobId: scanJob.id,
        scanTargetId: scanTarget.id,
        message: "Scan job created successfully",
      });

    } catch (workerError) {
      console.error("Error submitting to scan worker:", workerError);
      
      // Update job status to failed
      await prisma.scanJob.update({
        where: { id: scanJob.id },
        data: {
          status: "FAILED",
          error: "Failed to communicate with scan worker",
        },
      });

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