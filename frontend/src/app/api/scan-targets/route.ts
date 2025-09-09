import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/app/api/auth/[...nextauth]/utils";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const isActive = searchParams.get("active");

    const where: any = {
      userId: session.user.id,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { repoUrl: { contains: search, mode: "insensitive" } },
      ];
    }

    if (isActive !== null) {
      where.isActive = isActive === "true";
    }

    const scanTargets = await prisma.scanTarget.findMany({
      where,
      include: {
        scanJobs: {
          orderBy: { createdAt: "desc" },
          take: 1,
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
      orderBy: {
        lastScanAt: "desc",
      },
    });

    // Transform the data to include vulnerability counts
    const transformedTargets = scanTargets.map(
      (target: (typeof scanTargets)[0]) => {
        const lastScan = target.scanJobs[0];
        let vulnerabilityStats = {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          info: 0,
          total: 0,
        };

        if (lastScan?.vulnerabilities) {
          const severityCounts = lastScan.vulnerabilities.reduce(
            (acc: any, vuln) => {
              const severity = vuln.severity.toLowerCase() as keyof typeof acc;
              if (severity in acc && severity !== "total") {
                acc[severity]++;
              }
              acc.total++;
              return acc;
            },
            { critical: 0, high: 0, medium: 0, low: 0, info: 0, total: 0 }
          );
          vulnerabilityStats = severityCounts;
        }

        // Parse repository owner/name from repoUrl
        const repoUrlMatch = target.repoUrl.match(
          /github\.com\/([^\/]+)\/([^\/\.]+)/
        );
        const owner = repoUrlMatch?.[1] || "";
        const repo = repoUrlMatch?.[2] || "";

        return {
          ...target,
          owner,
          repo,
          lastScan: lastScan
            ? {
                id: lastScan.id,
                status: lastScan.status,
                createdAt: lastScan.createdAt,
                vulnerabilitiesFound: lastScan.vulnerabilitiesFound,
              }
            : null,
          vulnerabilityStats,
          totalScans: target._count.scanJobs,
        };
      }
    );

    return NextResponse.json({
      scanTargets: transformedTargets,
      total: transformedTargets.length,
    });
  } catch (error) {
    console.error("Error fetching scan targets:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, repoUrl, branch = "main", subPath } = body;

    if (!name || !repoUrl) {
      return NextResponse.json(
        { error: "Name and repository URL are required" },
        { status: 400 }
      );
    }

    // Normalize subPath: empty string or undefined becomes null
    const normalizedSubPath =
      subPath && subPath.trim() !== "" ? subPath.trim() : null;

    // Check if scan target already exists for this user
    const existingScanTarget = await prisma.scanTarget.findFirst({
      where: {
        userId: session.user.id,
        repoUrl,
        branch,
        subPath: normalizedSubPath,
      },
    });

    if (existingScanTarget) {
      return NextResponse.json(
        { error: "Scan target already exists for this repository and branch" },
        { status: 409 }
      );
    }

    const scanTarget = await prisma.scanTarget.create({
      data: {
        userId: session.user.id,
        name,
        description,
        repoUrl,
        branch,
        subPath: normalizedSubPath,
      },
    });

    return NextResponse.json(scanTarget, { status: 201 });
  } catch (error) {
    console.error("Error creating scan target:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
