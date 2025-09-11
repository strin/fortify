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
    try {
      await prisma.scanJob.update({
        where: { id: jobId },
        data: {
          status: "CANCELLED",
          finishedAt: new Date(),
          error: "Job cancelled by user"
        },
      });
    } catch (dbError: any) {
      // Handle specific enum error for better debugging
      if (dbError.code === 'P2022' || dbError.message?.includes('invalid input value for enum "JobStatus": "CANCELLED"')) {
        console.error("Database enum error: CANCELLED status not available in JobStatus enum. Migration may not have been applied.");
        return NextResponse.json(
          { 
            error: "Database configuration error: CANCELLED status not available. Please contact support.",
            details: "Migration 20250909044604_add_cancelled_job_status may not have been applied to the database."
          },
          { status: 500 }
        );
      }
      // Re-throw other database errors
      throw dbError;
    }

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
