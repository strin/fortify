import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const scanWorkerUrl =
      process.env.SCAN_WORKER_URL || "http://localhost:8000";

    const response = await fetch(`${scanWorkerUrl}/jobs/${jobId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }

      const errorText = await response.text();
      console.error("Scan worker error:", response.status, errorText);

      return NextResponse.json(
        { error: "Failed to fetch job status" },
        { status: 500 }
      );
    }

    const jobData = await response.json();
    return NextResponse.json(jobData);
  } catch (error) {
    console.error("Error fetching job status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
