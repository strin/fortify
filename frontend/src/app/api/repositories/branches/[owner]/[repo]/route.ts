import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/app/api/auth/[...nextauth]/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: { owner: string; repo: string } }
) {
  try {
    const session = await getServerSession();

    if (!session?.user?.githubAccessToken) {
      return NextResponse.json(
        { error: "GitHub access token not found" },
        { status: 401 }
      );
    }

    const { owner, repo } = params;

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/branches`,
      {
        headers: {
          Authorization: `token ${session.user.githubAccessToken}`,
          Accept: "application/vnd.github.v3+json",
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
