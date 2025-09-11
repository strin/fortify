import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/app/api/auth/[...nextauth]/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const scanWorkerUrl =
      process.env.SCAN_AGENT_URL || "http://localhost:8000";

    const response = await fetch(`${scanWorkerUrl}/jobs/${jobId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }

      const errorText = await response.text();
      console.error("Scan worker error:", response.status, errorText);

      return NextResponse.json(
        { error: "Failed to fetch job status" },
        { status: 500 }
      );
    }

    const jobData = await response.json();

    // For completed jobs, enhance the response with database statistics
    if (jobData.status === "COMPLETED") {
      try {
        // Fetch job details from database including vulnerabilities
        const scanJob = await prisma.scanJob.findUnique({
          where: { id: jobId },
          include: {
            vulnerabilities: {
              select: {
                severity: true,
                category: true,
                filePath: true,
                title: true,
              },
            },
          },
        });

        if (scanJob) {
          // Calculate vulnerability summary by severity
          const vulnerabilitySummary = {
            CRITICAL: 0,
            HIGH: 0,
            MEDIUM: 0,
            LOW: 0,
            INFO: 0,
          };

          // Get unique files scanned (approximate by counting unique file paths)
          const uniqueFiles = new Set<string>();

          // Process vulnerabilities
          scanJob.vulnerabilities.forEach((vuln) => {
            if (vuln.severity in vulnerabilitySummary) {
              vulnerabilitySummary[vuln.severity as keyof typeof vulnerabilitySummary]++;
            }
            if (vuln.filePath) {
              uniqueFiles.add(vuln.filePath);
            }
          });

          // Calculate scan duration
          let scanDuration = 0;
          if (scanJob.startedAt && scanJob.finishedAt) {
            scanDuration = new Date(scanJob.finishedAt).getTime() - new Date(scanJob.startedAt).getTime();
          }

          // Extract some sample vulnerabilities for preview
          const vulnerabilitiesPreview = scanJob.vulnerabilities.slice(0, 10).map((vuln) => ({
            severity: vuln.severity,
            title: vuln.title,
            file_path: vuln.filePath,
            category: vuln.category,
          }));

          // Enhance the result object with frontend-expected fields
          if (!jobData.result) {
            jobData.result = {};
          }

          // Add the stats the frontend expects
          jobData.result.vulnerabilities_found = scanJob.vulnerabilitiesFound || scanJob.vulnerabilities.length;
          jobData.result.files_scanned = uniqueFiles.size;
          jobData.result.scan_duration = scanDuration;
          jobData.result.engine_version = "Claude v2.1";
          jobData.result.vulnerability_summary = vulnerabilitySummary;
          jobData.result.vulnerabilities = vulnerabilitiesPreview;

          // Also add the stored job data for consistency
          jobData.data = scanJob.data ? JSON.parse(scanJob.data) : jobData.data;
        }
      } catch (dbError) {
        console.error("Error fetching job details from database:", dbError);
        // Continue without enhancement - don't fail the whole request
      }
    }

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
        { error: "Job cannot be cancelled. Only PENDING or IN_PROGRESS jobs can be cancelled." },
        { status: 400 }
      );
    }

    // Update job status to CANCELLED in database
    await prisma.scanJob.update({
      where: { id: jobId },
      data: {
        status: "CANCELLED",
        finishedAt: new Date(),
        error: "Job cancelled by user"
      },
    });

    // Try to signal the worker to cancel the job (optional - may fail if worker is not reachable)
    try {
      const scanWorkerUrl = process.env.SCAN_WORKER_URL || "http://localhost:8000";
      
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
        console.warn(`Failed to signal worker to cancel job ${jobId}: ${response.status}`);
      }
    } catch (workerError) {
      console.warn(`Failed to contact worker for job cancellation ${jobId}:`, workerError);
    }

    return NextResponse.json({
      message: "Job cancelled successfully",
      jobId: jobId,
      status: "CANCELLED"
    });

  } catch (error) {
    console.error("Error cancelling job:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
