import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/app/api/auth/[...nextauth]/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fixJobId: string }> }
) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fixJobId } = await params;

    const fixJob = await prisma.fixJob.findFirst({
      where: {
        id: fixJobId,
        userId: session.user.id,
      },
      include: {
        vulnerability: {
          select: {
            id: true,
            title: true,
            severity: true,
            category: true,
            filePath: true,
            startLine: true,
            endLine: true,
          },
        },
        scanJob: {
          select: {
            id: true,
            data: true,
          },
        },
      },
    });

    if (!fixJob) {
      return NextResponse.json(
        { error: "Fix job not found" },
        { status: 404 }
      );
    }

    // Format response with additional computed fields
    const response = {
      id: fixJob.id,
      status: fixJob.status,
      type: fixJob.type,
      createdAt: fixJob.createdAt,
      updatedAt: fixJob.updatedAt,
      startedAt: fixJob.startedAt,
      finishedAt: fixJob.finishedAt,
      vulnerability: fixJob.vulnerability,
      scanJobId: fixJob.scanJobId,
      branchName: fixJob.branchName,
      commitSha: fixJob.commitSha,
      pullRequestUrl: fixJob.pullRequestUrl,
      pullRequestId: fixJob.pullRequestId,
      error: fixJob.error,
      result: fixJob.result,
      // Add computed progress information
      progress: getProgressInfo(fixJob.status),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error("Error fetching fix job:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ fixJobId: string }> }
) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fixJobId } = await params;

    // Find the fix job
    const fixJob = await prisma.fixJob.findFirst({
      where: {
        id: fixJobId,
        userId: session.user.id,
      },
    });

    if (!fixJob) {
      return NextResponse.json(
        { error: "Fix job not found" },
        { status: 404 }
      );
    }

    // Only allow cancellation of pending or in-progress jobs
    if (!['PENDING', 'IN_PROGRESS'].includes(fixJob.status)) {
      return NextResponse.json(
        { error: `Cannot cancel fix job with status: ${fixJob.status}` },
        { status: 400 }
      );
    }

    // Update the fix job status to cancelled
    const updatedFixJob = await prisma.fixJob.update({
      where: { id: fixJobId },
      data: {
        status: 'CANCELLED',
        finishedAt: new Date(),
        error: 'Cancelled by user',
      },
    });

    // TODO: Call fix-agent API to cancel the job if it's in progress
    // await fetch(`http://fix-agent:8001/fix/jobs/${fixJobId}/cancel`, { method: 'POST' });

    return NextResponse.json({
      message: "Fix job cancelled successfully",
      fixJobId: updatedFixJob.id,
      status: updatedFixJob.status,
    });

  } catch (error) {
    console.error("Error cancelling fix job:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper function to provide progress information based on status
function getProgressInfo(status: string) {
  const progressMap = {
    PENDING: { stage: 'queued', message: 'Fix job queued for processing', progress: 10 },
    IN_PROGRESS: { stage: 'processing', message: 'Generating fix with AI...', progress: 50 },
    COMPLETED: { stage: 'completed', message: 'Fix completed successfully', progress: 100 },
    FAILED: { stage: 'failed', message: 'Fix job failed', progress: 0 },
    CANCELLED: { stage: 'cancelled', message: 'Fix job cancelled', progress: 0 },
  };

  return progressMap[status as keyof typeof progressMap] || { 
    stage: 'unknown', 
    message: 'Unknown status', 
    progress: 0 
  };
}