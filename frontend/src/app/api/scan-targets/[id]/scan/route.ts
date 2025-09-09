import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { getServerSession } from "@/app/api/auth/[...nextauth]/utils";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership and get scan target
    const scanTarget = await prisma.scanTarget.findFirst({
      where: {
        id: id,
        userId: session.user.id,
      },
    });

    if (!scanTarget) {
      return NextResponse.json(
        { error: "Scan target not found" },
        { status: 404 }
      );
    }

    if (!scanTarget.isActive) {
      return NextResponse.json(
        { error: "Scan target is inactive" },
        { status: 400 }
      );
    }

    // Update last scan time
    await prisma.scanTarget.update({
      where: { id: scanTarget.id },
      data: { lastScanAt: new Date() },
    });

    // Create or link a pending ScanJob BEFORE triggering the worker to avoid races
    const jobId = randomUUID();
    const scanRequest = {
      repo_url: scanTarget.repoUrl,
      branch: scanTarget.branch || "main",
      claude_cli_args: null,
      scan_options: scanTarget.subPath ? { sub_path: scanTarget.subPath } : {},
    };

    await prisma.scanJob.upsert({
      where: { id: jobId },
      update: { scanTargetId: scanTarget.id },
      create: {
        id: jobId,
        userId: session.user.id,
        scanTargetId: scanTarget.id,
        type: "SCAN_REPO",
        status: "PENDING",
        data: scanRequest,
      },
    });

    // Trigger actual scan worker
    try {
      const scanWorkerUrl =
        process.env.SCAN_WORKER_URL || "http://localhost:8000";

      const response = await fetch(`${scanWorkerUrl}/scan/repo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...scanRequest, job_id: jobId }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Scan worker error:", response.status, errorText);
        return NextResponse.json(
          { error: "Failed to trigger scan worker" },
          { status: 500 }
        );
      }

      const workerResponse = await response.json();
      console.log("Scan worker response:", workerResponse);

      return NextResponse.json({
        scanJobId: workerResponse.job_id ?? jobId,
        status: workerResponse.status,
        message: "Scan initiated successfully",
      });
    } catch (error) {
      console.error("Error calling scan worker:", error);
      return NextResponse.json(
        { error: "Failed to trigger scan worker" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error triggering scan:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
