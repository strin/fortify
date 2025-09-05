import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/app/api/auth/[...nextauth]/utils";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get all repositories that have been scanned by this user
    const scannedRepos = await prisma.scanJob.findMany({
      where: {
        userId: session.user.id,
      },
      select: {
        data: true,
        createdAt: true,
        status: true,
        vulnerabilitiesFound: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Extract unique repositories from scan data
    const repoMap = new Map();
    
    scannedRepos.forEach((scan) => {
      const scanData = scan.data as any;
      const repoKey = `${scanData.owner}/${scanData.repo}`;
      
      if (!repoMap.has(repoKey)) {
        repoMap.set(repoKey, {
          owner: scanData.owner,
          repo: scanData.repo,
          fullName: repoKey,
          totalScans: 0,
          lastScanned: scan.createdAt,
          totalVulnerabilities: 0,
          highestSeverityFound: 'INFO',
          completedScans: 0,
          failedScans: 0,
        });
      }
      
      const repoInfo = repoMap.get(repoKey);
      repoInfo.totalScans += 1;
      repoInfo.totalVulnerabilities += scan.vulnerabilitiesFound || 0;
      
      if (scan.createdAt > repoInfo.lastScanned) {
        repoInfo.lastScanned = scan.createdAt;
      }
      
      if (scan.status === 'COMPLETED') {
        repoInfo.completedScans += 1;
      } else if (scan.status === 'FAILED') {
        repoInfo.failedScans += 1;
      }
    });

    // Get vulnerability severity info for each repository
    for (const [repoKey, repoInfo] of repoMap.entries()) {
      const vulnerabilities = await prisma.codeVulnerability.findMany({
        where: {
          scanJob: {
            userId: session.user.id,
            data: {
              path: ['repo'],
              equals: repoInfo.repo,
            },
          },
        },
        select: {
          severity: true,
        },
      });

      // Determine highest severity
      const severityOrder = ['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
      let highestSeverity = 'INFO';
      
      vulnerabilities.forEach((vuln) => {
        if (severityOrder.indexOf(vuln.severity) > severityOrder.indexOf(highestSeverity)) {
          highestSeverity = vuln.severity;
        }
      });
      
      repoInfo.highestSeverityFound = highestSeverity;
    }

    const repositories = Array.from(repoMap.values());

    return NextResponse.json({
      repositories,
      total: repositories.length,
    });

  } catch (error) {
    console.error("Error fetching scanned repositories:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
