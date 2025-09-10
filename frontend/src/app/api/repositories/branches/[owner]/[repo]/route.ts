import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/app/api/auth/[...nextauth]/utils";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> }
) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Fetch GitHub access token directly from database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { githubAccessToken: true },
    });

    if (!user?.githubAccessToken) {
      return NextResponse.json(
        {
          error:
            "GitHub access token not found. Please reconnect your GitHub account.",
        },
        { status: 401 }
      );
    }

    const { owner, repo } = await params;

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/branches`,
      {
        headers: {
          Authorization: `Bearer ${user.githubAccessToken}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "Fortify-AI",
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: "Repository not found or not accessible" },
          { status: 404 }
        );
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const branches = await response.json();

    // Transform to simpler format
    const simplifiedBranches = branches.map((branch: any) => ({
      name: branch.name,
      protected: branch.protected,
      commit: {
        sha: branch.commit.sha,
        url: branch.commit.url,
      },
    }));

    return NextResponse.json({
      branches: simplifiedBranches,
      total: simplifiedBranches.length,
    });
  } catch (error) {
    console.error("Error fetching repository branches:", error);
    return NextResponse.json(
      { error: "Failed to fetch repository branches" },
      { status: 500 }
    );
  }
}
