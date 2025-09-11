import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../auth/[...nextauth]/config";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken || !session.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { owner, repo } = await params;
    const body = await request.json();
    const { repositoryId, projectId } = body;

    if (!repositoryId || !projectId) {
      return NextResponse.json(
        { error: "Repository ID and Project ID are required" },
        { status: 400 }
      );
    }

    const webhookUrl = `${process.env.NEXTAUTH_URL}/api/webhooks/github`;
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;

    if (!webhookSecret) {
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 }
      );
    }

    // Call scan agent to setup webhook
    const response = await fetch(
      `${process.env.SCAN_AGENT_URL}/setup-webhook`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({
          owner,
          repo,
          webhook_url: webhookUrl,
          secret: webhookSecret,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.detail || "Failed to setup webhook";

      // Return appropriate status code based on the error
      let statusCode = 500;
      if (response.status === 403) {
        statusCode = 403;
      } else if (response.status === 422) {
        statusCode = 422;
      } else if (response.status === 401) {
        statusCode = 401;
      }

      return NextResponse.json({ error: errorMessage }, { status: statusCode });
    }

    const result = await response.json();
    
    // Save webhook mapping to database
    if (result.webhook_id) {
      try {
        const webhookMapping = await prisma.repoWebhookMapping.create({
          data: {
            userId: session.user.id,
            projectId: projectId,
            repositoryId: repositoryId,
            webhookId: result.webhook_id.toString(), // Ensure it's a string
            provider: "GITHUB",
          },
        });
        
        console.log(`Created webhook mapping: ${webhookMapping.id} for webhook ${result.webhook_id}`);
      } catch (dbError) {
        console.error("Failed to save webhook mapping:", dbError);
        // Don't fail the whole request if DB save fails, but log it
        // The webhook was created successfully in GitHub
      }
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error setting up webhook:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to setup webhook",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { owner, repo } = await params;
    const body = await request.json();
    const { webhook_id } = body;

    if (!webhook_id) {
      return NextResponse.json(
        { error: "Webhook ID is required" },
        { status: 400 }
      );
    }

    // Call scan agent to remove webhook
    const response = await fetch(
      `${process.env.SCAN_AGENT_URL}/setup-webhook`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({
          owner,
          repo,
          webhook_id,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || "Failed to remove webhook");
    }

    const result = await response.json();
    
    // Clean up webhook mapping from database
    try {
      await prisma.repoWebhookMapping.deleteMany({
        where: {
          webhookId: webhook_id.toString(),
          provider: "GITHUB",
        },
      });
      
      console.log(`Deleted webhook mapping for webhook ${webhook_id}`);
    } catch (dbError) {
      console.error("Failed to delete webhook mapping:", dbError);
      // Don't fail the whole request if DB cleanup fails, but log it
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error removing webhook:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to remove webhook",
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { owner, repo } = await params;

    // Call scan agent to get webhooks
    const response = await fetch(
      `${process.env.SCAN_AGENT_URL}/webhooks/${owner}/${repo}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || "Failed to fetch webhooks");
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching webhooks:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch webhooks",
      },
      { status: 500 }
    );
  }
}
