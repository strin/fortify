import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/app/api/auth/[...nextauth]/utils";

export async function GET() {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
        createdAt: "desc",
      },
    });

    // Extract unique repositories from scan data
    const repoMap = new Map();

    scannedRepos.forEach((scan) => {
      const scanData = scan.data as any;
      const repoKey = `${scanData.owner}/${scanData.repo}`;

      // owner and repo can be parsed frmo repoUrl
      const repoUrl = scanData.repo_url;
      console.log("repoUrl", repoUrl);
      // repoUrl is like "https://github.com/ishepard/pydriller.git"
      // Remove trailing ".git" if present, then split
      const urlParts = repoUrl.replace(/\.git$/, "").split("/");
      const [owner, repo] = urlParts.slice(-2);

      if (!repoMap.has(repoKey)) {
        repoMap.set(repoKey, {
          owner: owner,
          repo: repo,
          fullName: `${owner}/${repo}`,
          totalScans: 0,
          lastScanned: scan.createdAt,
          totalVulnerabilities: 0,
          highestSeverityFound: "INFO",
          completedScans: 0,
          failedScans: 0,
        });
      }

      const repoInfo = repoMap.get(repoKey);
      repoInfo.totalScans += 1;

      if (scan.createdAt > repoInfo.lastScanned) {
        repoInfo.lastScanned = scan.createdAt;
        repoInfo.totalVulnerabilities = scan.vulnerabilitiesFound;
      }

      if (scan.status === "COMPLETED") {
        repoInfo.completedScans += 1;
      } else if (scan.status === "FAILED") {
        repoInfo.failedScans += 1;
      }
    });

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
