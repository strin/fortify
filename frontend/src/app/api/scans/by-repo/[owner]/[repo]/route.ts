import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/app/api/auth/[...nextauth]/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> }
) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { owner, repo } = await params;

    // Get all scans for this specific repository
    const scans = await prisma.scanJob.findMany({
      where: {
        userId: session.user.id,
        data: {
          path: ["repo_url"],
          string_contains: `${owner}/${repo}`,
        },
      },
      include: {
        vulnerabilities: {
          select: {
            id: true,
            severity: true,
            category: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log("scans", scans);

    // Process scans to include summary statistics
    const processedScans = scans.map((scan) => {
      const vulnerabilityCounts = {
        CRITICAL: 0,
        HIGH: 0,
        MEDIUM: 0,
        LOW: 0,
        INFO: 0,
      };

      const categoryCounts: Record<string, number> = {};

      scan.vulnerabilities.forEach((vuln) => {
        vulnerabilityCounts[
          vuln.severity as keyof typeof vulnerabilityCounts
        ]++;
        categoryCounts[vuln.category] =
          (categoryCounts[vuln.category] || 0) + 1;
      });

      return {
        id: scan.id,
        type: scan.type,
        status: scan.status,
        createdAt: scan.createdAt,
        updatedAt: scan.updatedAt,
        startedAt: scan.startedAt,
        finishedAt: scan.finishedAt,
        vulnerabilitiesFound: scan.vulnerabilitiesFound,
        error: scan.error,
        data: scan.data,
        vulnerabilityCounts,
        categoryCounts,
        totalVulnerabilities: scan.vulnerabilities.length,
      };
    });

    // Calculate repository summary
    const totalVulnerabilities = processedScans.reduce(
      (sum, scan) => sum + scan.totalVulnerabilities,
      0
    );

    const severityCounts = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
      INFO: 0,
    };

    processedScans.forEach((scan) => {
      Object.keys(scan.vulnerabilityCounts).forEach((severity) => {
        severityCounts[severity as keyof typeof severityCounts] +=
          scan.vulnerabilityCounts[
            severity as keyof typeof scan.vulnerabilityCounts
          ];
      });
    });

    const summary = {
      owner,
      repo,
      fullName: `${owner}/${repo}`,
      totalScans: scans.length,
      totalVulnerabilities,
      severityCounts,
      completedScans: scans.filter((s) => s.status === "COMPLETED").length,
      failedScans: scans.filter((s) => s.status === "FAILED").length,
      pendingScans: scans.filter((s) => s.status === "PENDING").length,
      inProgressScans: scans.filter((s) => s.status === "IN_PROGRESS").length,
      lastScanned: scans[0]?.createdAt || null,
    };

    return NextResponse.json({
      summary,
      scans: processedScans,
    });
  } catch (error) {
    console.error("Error fetching repository scans:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
