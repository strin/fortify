import { NextResponse } from "next/server";

interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  html_url: string;
  clone_url: string;
  size: number;
  default_branch: string;
  visibility: string;
  topics: string[];
}

interface SessionUser {
  user: {
    id: string;
  };
}

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = (await getServerSession(authOptions as any)) as SessionUser;

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user with GitHub access token from database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { githubAccessToken: true, githubUsername: true },
    });

    if (!user?.githubAccessToken) {
      return NextResponse.json(
        {
          error:
            "GitHub access token not found. Please reconnect your GitHub account.",
        },
        { status: 400 }
      );
    }

    // Fetch public repositories from GitHub API
    const response = await fetch(
      "https://api.github.com/user/repos?type=public&sort=updated&per_page=50",
      {
        headers: {
          Authorization: `Bearer ${user.githubAccessToken}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "Fortify-AI",
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error("GitHub API error:", response.status, errorData);
      return NextResponse.json(
        { error: "Failed to fetch repositories from GitHub" },
        { status: 500 }
      );
    }

    const repos = await response.json();

    // Filter and format repository data
    const formattedRepos = repos.map((repo: GitHubRepository) => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      description: repo.description,
      language: repo.language,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      updated_at: repo.updated_at,
      html_url: repo.html_url,
      clone_url: repo.clone_url,
      size: repo.size,
      default_branch: repo.default_branch,
      visibility: repo.visibility,
      topics: repo.topics || [],
    }));

    return NextResponse.json({ repositories: formattedRepos });
  } catch (error) {
    console.error("Error fetching GitHub repositories:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
