import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import * as crypto from "crypto";

/**
 * GitHub Webhook Proxy Handler
 *
 * This endpoint receives GitHub webhooks at the public domain (https://fortify.rocks)
 * and forwards them to the scan agent server for processing.
 */

// Configuration from environment variables
const SCAN_AGENT_URL = process.env.SCAN_AGENT_URL || "http://localhost:8000";
const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || "";

/**
 * Verify GitHub webhook signature using HMAC-SHA256
 */
function verifyGitHubSignature(payload: string, signature: string): boolean {
  if (!GITHUB_WEBHOOK_SECRET) {
    console.warn(
      "GITHUB_WEBHOOK_SECRET not configured - skipping signature verification"
    );
    return true;
  }

  if (!signature || !signature.startsWith("sha256=")) {
    console.error("Invalid signature format");
    return false;
  }

  const expectedSignature = signature.substring(7); // Remove "sha256=" prefix
  const hmac = crypto.createHmac("sha256", GITHUB_WEBHOOK_SECRET);
  hmac.update(payload, "utf8");
  const calculatedSignature = hmac.digest("hex");

  // Use constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "hex"),
      Buffer.from(calculatedSignature, "hex")
    );
  } catch (error) {
    console.error("Error in signature comparison:", error);
    return false;
  }
}

/**
 * Forward webhook request to scan agent server
 */
async function forwardWebhookToScanAgent(
  payload: string,
  githubHeaders: Record<string, string>
): Promise<Response> {
  try {
    console.log(
      `[Webhook Proxy] Forwarding request to scan agent: ${SCAN_AGENT_URL}/webhooks/github`
    );

    const response = await fetch(`${SCAN_AGENT_URL}/webhooks/github`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-GitHub-Event": githubHeaders["x-github-event"] || "",
        "X-GitHub-Delivery": githubHeaders["x-github-delivery"] || "",
        "X-Hub-Signature-256": githubHeaders["x-hub-signature-256"] || "",
        "X-GitHub-Hook-ID": githubHeaders["x-github-hook-id"] || "",
        "User-Agent": githubHeaders["user-agent"] || "GitHub-Hookshot-Proxy",
      },
      body: payload,
      // Set timeout for scan agent response
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    console.log(
      `[Webhook Proxy] Scan agent response: ${response.status} ${response.statusText}`
    );
    return response;
  } catch (error) {
    console.error("[Webhook Proxy] Error forwarding to scan agent:", error);

    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Scan agent request timeout");
    }

    throw new Error(
      `Failed to forward webhook: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Handle GitHub webhook POST requests
 */
export async function POST(request: NextRequest) {
  try {
    const startTime = Date.now();

    // Extract GitHub headers
    const headersList = await headers();
    const githubEvent = headersList.get("x-github-event") || "";
    const githubDelivery = headersList.get("x-github-delivery") || "";
    const githubSignature = headersList.get("x-hub-signature-256") || "";
    const githubHookId = headersList.get("x-github-hook-id") || "";
    const userAgent = headersList.get("user-agent") || "";

    console.log(
      `[Webhook Proxy] Received GitHub webhook: event=${githubEvent}, delivery=${githubDelivery}, hook_id=${githubHookId}`
    );

    // Read request body
    const payload = await request.text();
    console.log(`[Webhook Proxy] Payload size: ${payload.length} bytes`);

    // Verify webhook signature at the proxy level
    if (!verifyGitHubSignature(payload, githubSignature)) {
      console.error("[Webhook Proxy] Webhook signature verification failed");
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 403 }
      );
    }

    console.log("[Webhook Proxy] Webhook signature verification successful");

    // Prepare headers to forward
    const forwardHeaders = {
      "x-github-event": githubEvent,
      "x-github-delivery": githubDelivery,
      "x-hub-signature-256": githubSignature,
      "x-github-hook-id": githubHookId,
      "user-agent": userAgent,
    };

    // Forward request to scan agent
    const scanAgentResponse = await forwardWebhookToScanAgent(
      payload,
      forwardHeaders
    );

    // Parse scan agent response
    const responseData = await scanAgentResponse.json();
    const processingTime = Date.now() - startTime;

    console.log(`[Webhook Proxy] Processing completed in ${processingTime}ms`);

    // Log success details
    if (scanAgentResponse.ok) {
      console.log(
        `[Webhook Proxy] Successfully processed ${githubEvent} event`
      );
      if (responseData.job_id) {
        console.log(`[Webhook Proxy] Created scan job: ${responseData.job_id}`);
      }
    } else {
      console.error(
        `[Webhook Proxy] Scan agent returned error: ${scanAgentResponse.status}`
      );
    }

    // Return scan agent response with additional proxy metadata
    return NextResponse.json(
      {
        ...responseData,
        proxy: {
          processed_at: new Date().toISOString(),
          processing_time_ms: processingTime,
          scan_agent_url: SCAN_AGENT_URL,
          proxy_version: "1.0.0",
        },
      },
      { status: scanAgentResponse.status }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[Webhook Proxy] Error processing webhook:", error);

    // Return error response
    return NextResponse.json(
      {
        error: "Webhook proxy error",
        message: errorMessage,
        proxy: {
          processed_at: new Date().toISOString(),
          scan_agent_url: SCAN_AGENT_URL,
          proxy_version: "1.0.0",
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Handle GET requests for webhook testing
 */
export async function GET() {
  try {
    console.log("[Webhook Proxy] Health check requested");

    // Test connection to scan agent
    let scanAgentStatus = "unknown";
    let scanAgentError: string | null = null;

    try {
      const testResponse = await fetch(`${SCAN_AGENT_URL}/health`, {
        method: "GET",
        signal: AbortSignal.timeout(5000), // 5 second timeout for health check
      });

      scanAgentStatus = testResponse.ok
        ? "healthy"
        : `error_${testResponse.status}`;
    } catch (error) {
      scanAgentStatus = "unreachable";
      scanAgentError = error instanceof Error ? error.message : "Unknown error";
    }

    return NextResponse.json({
      status: "healthy",
      message: "GitHub Webhook Proxy is operational",
      configuration: {
        scan_agent_url: SCAN_AGENT_URL,
        webhook_secret_configured: !!GITHUB_WEBHOOK_SECRET,
        scan_agent_status: scanAgentStatus,
        scan_agent_error: scanAgentError,
      },
      endpoints: {
        webhook: "/api/webhooks/github",
        scan_agent_webhook: `${SCAN_AGENT_URL}/webhooks/github`,
        scan_agent_health: `${SCAN_AGENT_URL}/health`,
      },
      setup_instructions: {
        environment_variables: {
          SCAN_AGENT_URL:
            "URL of the scan agent server (e.g., http://localhost:8000)",
          GITHUB_WEBHOOK_SECRET: "Shared secret for GitHub webhook validation",
        },
        github_webhook_config: {
          payload_url: "https://fortify.rocks/api/webhooks/github",
          content_type: "application/json",
          events: ["pull_request", "push"],
          active: true,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Webhook Proxy] Error in health check:", error);

    return NextResponse.json(
      {
        status: "error",
        message: "Webhook proxy health check failed",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
