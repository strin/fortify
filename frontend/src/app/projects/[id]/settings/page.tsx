"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Github, GitBranch, Settings, Webhook, Loader2 } from "lucide-react";

interface Repository {
  id: string;
  fullName: string;
  description: string | null;
  provider: string;
  defaultBranch: string;
  isPrivate: boolean;
  lastScanAt: string | null;
  repoUrl: string;
  scanTargets: any[];
  totalScanTargets: number;
  webhookSubscribed: boolean;
  webhookId: string | null;
  webhookCreatedAt: string | null;
  webhookLastTriggered: string | null;
}

interface Project {
  id: string;
  repositories: Repository[];
}

export default function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string>("");
  const [webhookLoading, setWebhookLoading] = useState<Record<string, boolean>>(
    {}
  );
  const [webhookMessage, setWebhookMessage] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Get project ID from params
  useEffect(() => {
    params.then((p) => setProjectId(p.id));
  }, [params]);

  // Fetch project data
  useEffect(() => {
    if (projectId) {
      fetchProject();
    }
  }, [projectId]);

  // Auto-hide success messages after 5 seconds
  useEffect(() => {
    if (webhookMessage && webhookMessage.type === "success") {
      const timer = setTimeout(() => {
        setWebhookMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [webhookMessage]);

  const fetchProject = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/projects/${projectId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch project");
      }

      setProject(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch project");
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return "Today";
    if (diffInDays === 1) return "Yesterday";
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return `${Math.floor(diffInDays / 30)} months ago`;
  };

  const handleWebhookSubscription = async (
    repo: Repository,
    subscribe: boolean
  ) => {
    const [owner, repoName] = repo.fullName.split("/");
    const repoKey = `${owner}/${repoName}`;

    setWebhookLoading((prev) => ({ ...prev, [repoKey]: true }));

    try {
      if (subscribe) {
        // Subscribe to webhook
        const response = await fetch(
          `/api/repositories/${owner}/${repoName}/webhook`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              repositoryId: repo.id,
              projectId: projectId,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to subscribe to webhook");
        }

        const result = await response.json();

        // Update the repository in state
        setProject((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            repositories: prev.repositories.map((r) =>
              r.id === repo.id
                ? {
                    ...r,
                    webhookSubscribed: true,
                    webhookId: result.webhook_id,
                    webhookCreatedAt: new Date().toISOString(),
                    webhookLastTriggered: null,
                  }
                : r
            ),
          };
        });

        setWebhookMessage({
          type: "success",
          message: `Successfully subscribed to webhooks for ${repo.fullName}`,
        });
      } else {
        // Unsubscribe from webhook
        if (!repo.webhookId) {
          throw new Error("No webhook ID found");
        }

        const response = await fetch(
          `/api/repositories/${owner}/${repoName}/webhook`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              webhook_id: repo.webhookId,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || "Failed to unsubscribe from webhook"
          );
        }

        // Update the repository in state
        setProject((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            repositories: prev.repositories.map((r) =>
              r.id === repo.id
                ? { 
                    ...r, 
                    webhookSubscribed: false, 
                    webhookId: null,
                    webhookCreatedAt: null,
                    webhookLastTriggered: null
                  }
                : r
            ),
          };
        });

        setWebhookMessage({
          type: "success",
          message: `Successfully unsubscribed from webhooks for ${repo.fullName}`,
        });
      }
    } catch (error) {
      console.error("Error managing webhook subscription:", error);
      setWebhookMessage({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to manage webhook subscription",
      });
    } finally {
      setWebhookLoading((prev) => ({ ...prev, [repoKey]: false }));
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(2)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-6 bg-muted rounded w-1/3 mb-4"></div>
                <div className="h-32 bg-muted rounded w-full"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">{error}</p>
        <Button onClick={fetchProject} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Webhook Status Message */}
      {webhookMessage && (
        <div
          className={`p-4 rounded-lg border ${
            webhookMessage.type === "success"
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          <div className="flex justify-between items-center">
            <p className="text-sm">{webhookMessage.message}</p>
            <button
              onClick={() => setWebhookMessage(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Repositories Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            Repository Configuration
          </CardTitle>
          <CardDescription>
            Manage repositories included in this project
          </CardDescription>
        </CardHeader>
        <CardContent>
          {project.repositories.length === 0 ? (
            <div className="text-center py-8">
              <Github className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">
                No repositories configured
              </p>
              <Button className="bg-primary hover:bg-primary/90">
                <Github className="h-4 w-4 mr-2" />
                Add Repository
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  {project.repositories.length} repositories configured
                </p>
                <Button size="sm" className="bg-primary hover:bg-primary/90">
                  <Github className="h-4 w-4 mr-2" />
                  Add Repository
                </Button>
              </div>
              {project.repositories.map((repo) => (
                <div
                  key={repo.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Github className="h-4 w-4" />
                      <span className="font-medium">{repo.fullName}</span>
                      {repo.isPrivate && (
                        <Badge variant="secondary" className="text-xs">
                          Private
                        </Badge>
                      )}
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <GitBranch className="h-3 w-3" />
                        {repo.defaultBranch}
                      </div>
                    </div>
                    {repo.description && (
                      <p className="text-muted-foreground text-sm">
                        {repo.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>Scan Targets: {repo.totalScanTargets}</span>
                      {repo.lastScanAt && (
                        <span>Last Scan: {formatTimeAgo(repo.lastScanAt)}</span>
                      )}
                      {repo.webhookSubscribed && (
                        <div className="flex items-center gap-1 text-green-600">
                          <Webhook className="h-3 w-3" />
                          <span>
                            Webhook Active
                            {repo.webhookLastTriggered && 
                              ` • Last triggered: ${formatTimeAgo(repo.webhookLastTriggered)}`
                            }
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={repo.webhookSubscribed ? "outline" : "default"}
                      onClick={() =>
                        handleWebhookSubscription(repo, !repo.webhookSubscribed)
                      }
                      disabled={webhookLoading[repo.fullName] || false}
                      className={
                        repo.webhookSubscribed
                          ? "text-destructive hover:text-destructive/80"
                          : ""
                      }
                    >
                      {webhookLoading[repo.fullName] ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Webhook className="h-4 w-4 mr-2" />
                      )}
                      {repo.webhookSubscribed ? "Unsubscribe" : "Subscribe"}
                    </Button>
                    <Button size="sm" variant="outline">
                      Configure
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:text-destructive/80"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Project Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Project Settings
          </CardTitle>
          <CardDescription>
            Configure project behavior and notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Settings className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              Advanced settings are coming soon. You&apos;ll be able to
              configure automatic scans, notifications, and security policies.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
