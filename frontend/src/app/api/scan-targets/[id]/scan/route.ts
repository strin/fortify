import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/app/api/auth/[...nextauth]/utils";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    // Trigger actual scan worker
    try {
      const scanWorkerUrl =
        process.env.SCAN_WORKER_URL || "http://localhost:8000";
      const scanRequest = {
        repo_url: scanTarget.repoUrl,
        branch: scanTarget.branch || "main",
        claude_cli_args: null,
        scan_options: scanTarget.subPath
          ? { sub_path: scanTarget.subPath }
          : {},
      };

      const response = await fetch(`${scanWorkerUrl}/scan/repo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(scanRequest),
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

      // After triggering the scan worker, create a scanJob record linked to this scan target
      // Update the scanJob record in the database to link it to this scan target
      await prisma.scanJob.update({
        where: { id: workerResponse.job_id },
        data: { scanTargetId: scanTarget.id },
      });

      return NextResponse.json({
        scanJobId: workerResponse.job_id,
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
