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

    // Verify ownership and get scan target
    const scanTarget = await prisma.scanTarget.findFirst({
      where: {
        id: params.id,
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

    // Create scan job data structure matching the existing format
    const scanJobData = {
      repo_url: scanTarget.repoUrl,
      branch: scanTarget.branch,
      ...(scanTarget.subPath && { sub_path: scanTarget.subPath }),
    };

    // Create scan job
    const scanJob = await prisma.scanJob.create({
      data: {
        userId: session.user.id,
        scanTargetId: scanTarget.id,
        type: "SCAN_REPO",
        status: "PENDING",
        data: scanJobData,
      },
    });

    // Update last scan time
    await prisma.scanTarget.update({
      where: { id: scanTarget.id },
      data: { lastScanAt: new Date() },
    });

    // TODO: Trigger actual scan worker
    // This would typically send a message to a queue or call the scan service
    console.log("Scan job created:", scanJob.id, "for target:", scanTarget.name);

    return NextResponse.json({
      scanJobId: scanJob.id,
      status: scanJob.status,
      message: "Scan initiated successfully",
    });
  } catch (error) {
    console.error("Error triggering scan:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
