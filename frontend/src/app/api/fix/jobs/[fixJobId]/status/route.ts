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

    // Lightweight query - only fetch necessary fields for status checking
    const fixJob = await prisma.fixJob.findFirst({
      where: {
        id: fixJobId,
        userId: session.user.id,
      },
      select: {
        id: true,
        status: true,
        error: true,
        pullRequestUrl: true,
        pullRequestId: true,
        branchName: true,
        startedAt: true,
        finishedAt: true,
        updatedAt: true,
      },
    });

    if (!fixJob) {
      return NextResponse.json(
        { error: "Fix job not found" },
        { status: 404 }
      );
    }

    // Calculate progress and stage information
    const progressInfo = getDetailedProgressInfo(fixJob.status, fixJob.startedAt);

    const response = {
      id: fixJob.id,
      status: fixJob.status,
      error: fixJob.error,
      pullRequestUrl: fixJob.pullRequestUrl,
      pullRequestId: fixJob.pullRequestId,
      branchName: fixJob.branchName,
      updatedAt: fixJob.updatedAt,
      ...progressInfo,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error("Error fetching fix job status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Enhanced progress information with more detailed stages and timing
function getDetailedProgressInfo(status: string, startedAt: Date | null) {
  const now = new Date();
  const timeElapsed = startedAt ? Math.floor((now.getTime() - startedAt.getTime()) / 1000) : 0;

  switch (status) {
    case 'PENDING':
      return {
        stage: 'queued',
        message: 'Waiting for available worker...',
        progress: 5,
        estimatedTimeRemaining: 30, // seconds
      };

    case 'IN_PROGRESS':
      // Provide different sub-stages based on time elapsed
      if (timeElapsed < 30) {
        return {
          stage: 'analyzing',
          message: 'Analyzing vulnerability...',
          progress: 20,
          estimatedTimeRemaining: 180,
        };
      } else if (timeElapsed < 120) {
        return {
          stage: 'generating',
          message: 'Generating fix with AI...',
          progress: 50,
          estimatedTimeRemaining: 120,
        };
      } else if (timeElapsed < 180) {
        return {
          stage: 'applying',
          message: 'Applying fix to codebase...',
          progress: 75,
          estimatedTimeRemaining: 60,
        };
      } else {
        return {
          stage: 'finalizing',
          message: 'Creating pull request...',
          progress: 90,
          estimatedTimeRemaining: 30,
        };
      }

    case 'COMPLETED':
      return {
        stage: 'completed',
        message: 'Fix applied successfully!',
        progress: 100,
        estimatedTimeRemaining: 0,
      };

    case 'FAILED':
      return {
        stage: 'failed',
        message: 'Fix generation failed',
        progress: 0,
        estimatedTimeRemaining: 0,
      };

    case 'CANCELLED':
      return {
        stage: 'cancelled',
        message: 'Fix job was cancelled',
        progress: 0,
        estimatedTimeRemaining: 0,
      };

    default:
      return {
        stage: 'unknown',
        message: 'Processing...',
        progress: 0,
        estimatedTimeRemaining: null,
      };
  }
}