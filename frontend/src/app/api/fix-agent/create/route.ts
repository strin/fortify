import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/config";

interface FixJobRequest {
  scanJobId: string;
  vulnerabilityId: string;
  scanJobData: any; // Contains repo info
  vulnerability: {
    id: string;
    title: string;
    description: string;
    severity: string;
    category: string;
    filePath: string;
    startLine: number;
    endLine?: number;
    codeSnippet: string;
    recommendation: string;
    metadata?: any;
  };
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Parse request body
    const body: FixJobRequest = await request.json();
    const { scanJobId, vulnerabilityId, scanJobData, vulnerability } = body;

    // Validate required fields
    if (!scanJobId || !vulnerabilityId || !scanJobData || !vulnerability) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Extract repository information from scanJobData
    const repoUrl = scanJobData.repo_url;
    const branch = scanJobData.branch || "main";
    
    if (!repoUrl) {
      return NextResponse.json(
        { error: "Repository URL not found in scan job data" },
        { status: 400 }
      );
    }

    // Prepare fix job data
    const fixJobData = {
      repo_url: repoUrl,
      branch: branch,
      commit_hash: scanJobData.commit_hash || null,
      vulnerability: {
        id: vulnerability.id,
        title: vulnerability.title,
        description: vulnerability.description,
        severity: vulnerability.severity,
        category: vulnerability.category,
        filePath: vulnerability.filePath,
        startLine: vulnerability.startLine,
        endLine: vulnerability.endLine,
        codeSnippet: vulnerability.codeSnippet,
        recommendation: vulnerability.recommendation,
        metadata: vulnerability.metadata,
      },
      scan_job_id: scanJobId,
      user_id: session.user.id,
    };

    // Call fix-agent service to create fix job
    const fixAgentUrl = process.env.FIX_AGENT_URL || "http://localhost:8001";
    const fixResponse = await fetch(`${fixAgentUrl}/fix/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "FIX_VULNERABILITY",
        data: fixJobData,
      }),
    });

    if (!fixResponse.ok) {
      const errorText = await fixResponse.text();
      console.error("Fix agent error:", errorText);
      return NextResponse.json(
        { error: "Failed to create fix job" },
        { status: 500 }
      );
    }

    const fixResult = await fixResponse.json();

    return NextResponse.json({
      jobId: fixResult.job_id,
      message: "Fix job created successfully",
    });

  } catch (error) {
    console.error("Error creating fix job:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}