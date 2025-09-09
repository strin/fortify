import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/app/api/auth/[...nextauth]/utils";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.githubAccessToken) {
      return NextResponse.json(
        { error: "GitHub access token not found" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { repoUrl } = body;

    if (!repoUrl) {
      return NextResponse.json(
        { error: "Repository URL is required" },
        { status: 400 }
      );
    }

    // Extract owner and repo from URL
    const repoUrlMatch = repoUrl.match(/github\.com\/([^\/]+)\/([^\/\.]+)/);
    if (!repoUrlMatch) {
      return NextResponse.json(
        { error: "Invalid GitHub repository URL" },
        { status: 400 }
      );
    }

    const [, owner, repo] = repoUrlMatch;

    // Check if repository exists and is accessible
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
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
          { 
            valid: false, 
            error: "Repository not found or not accessible" 
          },
          { status: 200 }
        );
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const repoData = await response.json();

    return NextResponse.json({
      valid: true,
      repository: {
        id: repoData.id,
        name: repoData.name,
        fullName: repoData.full_name,
        description: repoData.description,
        language: repoData.language,
        defaultBranch: repoData.default_branch,
        private: repoData.private,
        cloneUrl: repoData.clone_url,
        htmlUrl: repoData.html_url,
        owner: {
          login: repoData.owner.login,
          avatarUrl: repoData.owner.avatar_url,
        },
      },
    });
  } catch (error) {
    console.error("Error validating repository:", error);
    return NextResponse.json(
      { error: "Failed to validate repository" },
      { status: 500 }
    );
  }
}
