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
      ];
    }

    if (isActive !== null) {
      where.isActive = isActive === "true";
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        repositories: {
          select: {
            id: true,
            fullName: true,
            provider: true,
          },
        },
        scanJobs: {
          orderBy: { createdAt: "desc" },
          take: 5, // Recent scans for overview
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
            repositories: true,
          },
        },
      },
      orderBy: {
        lastScanAt: "desc",
      },
    });

    // Transform the data to include aggregated stats
    const transformedProjects = projects.map((project) => {
      // Calculate vulnerability stats from recent completed scans
      let vulnerabilityStats = {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        info: 0,
        total: 0,
      };

      // Get vulnerability stats from the most recent completed scan
      const recentCompletedScan = project.scanJobs.find(
        (scan) => scan.status === "COMPLETED"
      );

      if (recentCompletedScan?.vulnerabilities) {
        const severityCounts = recentCompletedScan.vulnerabilities.reduce(
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

      // Calculate scan status counts
      const scanStats = {
        total: project._count.scanJobs,
        completed: project.scanJobs.filter((scan) => scan.status === "COMPLETED").length,
        failed: project.scanJobs.filter((scan) => scan.status === "FAILED").length,
        pending: project.scanJobs.filter((scan) => scan.status === "PENDING").length,
        inProgress: project.scanJobs.filter((scan) => scan.status === "IN_PROGRESS").length,
      };

      return {
        ...project,
        vulnerabilityStats,
        scanStats,
        totalRepositories: project._count.repositories,
        recentScans: project.scanJobs.map((scan) => ({
          id: scan.id,
          status: scan.status,
          createdAt: scan.createdAt,
          vulnerabilitiesFound: scan.vulnerabilitiesFound,
        })),
      };
    });

    return NextResponse.json({
      projects: transformedProjects,
      total: transformedProjects.length,
    });
  } catch (error) {
    console.error("Error fetching projects:", error);
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
    const { name, description } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Project name is required" },
        { status: 400 }
      );
    }

    // Check if project already exists for this user
    const existingProject = await prisma.project.findFirst({
      where: {
        userId: session.user.id,
        name: name.trim(),
      },
    });

    if (existingProject) {
      return NextResponse.json(
        { error: "Project with this name already exists" },
        { status: 409 }
      );
    }

    const project = await prisma.project.create({
      data: {
        userId: session.user.id,
        name: name.trim(),
        description: description?.trim() || null,
      },
      include: {
        repositories: true,
        _count: {
          select: {
            scanJobs: true,
            repositories: true,
          },
        },
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}