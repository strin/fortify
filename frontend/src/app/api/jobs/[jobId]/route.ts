import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/app/api/auth/[...nextauth]/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    // Query the job directly from the database
    const job = await prisma.scanJob.findUnique({
      where: { id: jobId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        scanTarget: {
          select: {
            id: true,
            name: true,
          },
        },
        vulnerabilities: {
          select: {
            id: true,
            title: true,
            description: true,
            severity: true,
            category: true,
            filePath: true,
            startLine: true,
            endLine: true,
            codeSnippet: true,
            recommendation: true,
            metadata: true,
            createdAt: true,
          },
          orderBy: [
            { severity: "asc" }, // CRITICAL first, INFO last
            { createdAt: "desc" },
          ],
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Calculate vulnerability summary from actual database data
    const vulnerabilitySummary = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
      INFO: 0,
    };

    const categorySummary: Record<string, number> = {};

    job.vulnerabilities.forEach((vuln) => {
      vulnerabilitySummary[vuln.severity]++;
      categorySummary[vuln.category] =
        (categorySummary[vuln.category] || 0) + 1;
    });

    // Transform the database job to match the expected API response format
    // but enhance it with rich database vulnerability data
    const jobData = {
      job_id: job.id,
      status: job.status,
      type: job.type,
      created_at: job.createdAt,
      updated_at: job.updatedAt,
      started_at: job.startedAt,
      finished_at: job.finishedAt,
      result: {
        // Keep existing result data but enhance with calculated summaries
        ...(job.result as Record<string, any> || {}),
        vulnerabilities_found: job.vulnerabilities.length,
        vulnerability_summary: vulnerabilitySummary,
        category_summary: categorySummary,
        // Include first few vulnerabilities for preview (like the current UI expects)
        vulnerabilities: job.vulnerabilities.slice(0, 10).map((vuln) => ({
          id: vuln.id,
          title: vuln.title,
          description: vuln.description,
          severity: vuln.severity,
          category: vuln.category,
          file_path: vuln.filePath,
          start_line: vuln.startLine,
          end_line: vuln.endLine,
          code_snippet: vuln.codeSnippet,
          recommendation: vuln.recommendation,
          metadata: vuln.metadata,
        })),
      },
      error: job.error,
      data: job.data,
      vulnerabilities_found: job.vulnerabilities.length, // Use actual count from DB
      github_check_id: job.githubCheckId,
      github_check_url: job.githubCheckUrl,
      user: job.user,
      project: job.project,
      scan_target: job.scanTarget,
      // Full vulnerability details for comprehensive access
      vulnerabilities: job.vulnerabilities,
    };


    return NextResponse.json(jobData);
  } catch (error) {
    console.error("Error fetching job status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobId } = await params;

    // Verify the job belongs to the user and is in a cancellable state
    const job = await prisma.scanJob.findFirst({
      where: {
        id: jobId,
        userId: session.user.id,
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.status !== "IN_PROGRESS" && job.status !== "PENDING") {
      return NextResponse.json(
        {
          error:
            "Job cannot be cancelled. Only PENDING or IN_PROGRESS jobs can be cancelled.",
        },
        { status: 400 }
      );
    }

    // Update job status to CANCELLED in database
    await prisma.scanJob.update({
      where: { id: jobId },
      data: {
        status: "CANCELLED",
        finishedAt: new Date(),
        error: "Job cancelled by user",
      },
    });

    // Try to signal the worker to cancel the job (optional - may fail if worker is not reachable)
    try {
      const scanWorkerUrl =
        process.env.SCAN_WORKER_URL || "http://localhost:8000";

      const response = await fetch(`${scanWorkerUrl}/jobs/${jobId}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      // Don't fail if worker is not reachable - the database update is the source of truth
      if (response.ok) {
        console.log(`Successfully signaled worker to cancel job ${jobId}`);
      } else {
        console.warn(
          `Failed to signal worker to cancel job ${jobId}: ${response.status}`
        );
      }
    } catch (workerError) {
      console.warn(
        `Failed to contact worker for job cancellation ${jobId}:`,
        workerError
      );
    }

    return NextResponse.json({
      message: "Job cancelled successfully",
      jobId: jobId,
      status: "CANCELLED",
    });
  } catch (error) {
    console.error("Error cancelling job:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
