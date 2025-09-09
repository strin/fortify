import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/app/api/auth/[...nextauth]/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const scanTarget = await prisma.scanTarget.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        scanJobs: {
          orderBy: { createdAt: "desc" },
          take: 5,
          include: {
            vulnerabilities: {
              select: {
                severity: true,
              },
            },
          },
        },
        _count: {
          select: {
            scanJobs: true,
          },
        },
      },
    });

    if (!scanTarget) {
      return NextResponse.json(
        { error: "Scan target not found" },
        { status: 404 }
      );
    }

    // Parse repository owner/name from repoUrl
    const repoUrlMatch = scanTarget.repoUrl.match(
      /github\.com\/([^\/]+)\/([^\/\.]+)/
    );
    const owner = repoUrlMatch?.[1] || "";
    const repo = repoUrlMatch?.[2] || "";

    const response = {
      ...scanTarget,
      owner,
      repo,
      totalScans: scanTarget._count.scanJobs,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching scan target:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, branch, subPath, isActive } = body;

    // Verify ownership
    const existingScanTarget = await prisma.scanTarget.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingScanTarget) {
      return NextResponse.json(
        { error: "Scan target not found" },
        { status: 404 }
      );
    }

    const scanTarget = await prisma.scanTarget.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(branch && { branch }),
        ...(subPath !== undefined && { subPath }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json(scanTarget);
  } catch (error) {
    console.error("Error updating scan target:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const existingScanTarget = await prisma.scanTarget.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingScanTarget) {
      return NextResponse.json(
        { error: "Scan target not found" },
        { status: 404 }
      );
    }

    await prisma.scanTarget.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting scan target:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
