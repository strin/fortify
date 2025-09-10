import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/app/api/auth/[...nextauth]/utils";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobId } = await params;

    // Fetch scan job with related data
    const scanJob = await prisma.scanJob.findFirst({
      where: {
        id: jobId,
        userId: session.user.id,
      },
      include: {
        project: true,
        scanTarget: {
          include: {
            repository: true,
          },
        },
        vulnerabilities: {
          select: {
            severity: true,
            category: true,
          },
        },
      },
    });

    if (!scanJob) {
      return NextResponse.json({ error: "Scan job not found" }, { status: 404 });
    }

    // Calculate vulnerability counts
    const vulnerabilityCounts = {
      CRITICAL: scanJob.vulnerabilities.filter((v) => v.severity === "CRITICAL").length,
      HIGH: scanJob.vulnerabilities.filter((v) => v.severity === "HIGH").length,
      MEDIUM: scanJob.vulnerabilities.filter((v) => v.severity === "MEDIUM").length,
      LOW: scanJob.vulnerabilities.filter((v) => v.severity === "LOW").length,
      INFO: scanJob.vulnerabilities.filter((v) => v.severity === "INFO").length,
    };

    // Calculate category counts
    const categoryCounts = scanJob.vulnerabilities.reduce((acc: Record<string, number>, vuln) => {
      acc[vuln.category] = (acc[vuln.category] || 0) + 1;
      return acc;
    }, {});

    // Calculate time elapsed
    let timeElapsedMs = 0;
    if (scanJob.startedAt) {
      const endTime = scanJob.finishedAt || new Date();
      timeElapsedMs = endTime.getTime() - scanJob.startedAt.getTime();
    }

    // Prepare response data
    const response = {
      id: scanJob.id,
      type: scanJob.type,
      status: scanJob.status,
      data: scanJob.data,
      result: scanJob.result,
      error: scanJob.error,
      createdAt: scanJob.createdAt.toISOString(),
      updatedAt: scanJob.updatedAt.toISOString(),
      startedAt: scanJob.startedAt?.toISOString(),
      finishedAt: scanJob.finishedAt?.toISOString(),
      vulnerabilitiesFound: scanJob.vulnerabilitiesFound,
      timeElapsedMs,
      vulnerabilityCounts,
      categoryCounts,
      totalVulnerabilities: scanJob.vulnerabilities.length,
      project: scanJob.project ? {
        id: scanJob.project.id,
        name: scanJob.project.name,
        description: scanJob.project.description,
      } : null,
      scanTarget: scanJob.scanTarget ? {
        id: scanJob.scanTarget.id,
        name: scanJob.scanTarget.name,
        description: scanJob.scanTarget.description,
        repoUrl: scanJob.scanTarget.repoUrl,
        branch: scanJob.scanTarget.branch,
        subPath: scanJob.scanTarget.subPath,
        repository: scanJob.scanTarget.repository ? {
          id: scanJob.scanTarget.repository.id,
          fullName: scanJob.scanTarget.repository.fullName,
          description: scanJob.scanTarget.repository.description,
        } : null,
      } : null,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error("Error fetching scan job:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Cancel scan job
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

    // Find and update the scan job
    const scanJob = await prisma.scanJob.findFirst({
      where: {
        id: jobId,
        userId: session.user.id,
        status: { in: ["PENDING", "IN_PROGRESS"] }, // Can only cancel pending or in-progress jobs
      },
    });

    if (!scanJob) {
      return NextResponse.json(
        { error: "Scan job not found or cannot be cancelled" },
        { status: 404 }
      );
    }

    // Update the job to cancelled status
    const updatedJob = await prisma.scanJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED", // Using FAILED status for cancelled jobs
        error: "Scan cancelled by user",
        finishedAt: new Date(),
      },
    });

    // TODO: Also signal the scan worker to stop processing this job

    return NextResponse.json({
      message: "Scan job cancelled successfully",
      scanJob: {
        id: updatedJob.id,
        status: updatedJob.status,
        error: updatedJob.error,
      },
    });

  } catch (error) {
    console.error("Error cancelling scan job:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}