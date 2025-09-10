"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Play,
  Shield,
  Target,
} from "lucide-react";

interface VulnerabilitySummary {
  CRITICAL: number;
  HIGH: number;
  MEDIUM: number;
  LOW: number;
  INFO: number;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastScanAt: string | null;
  repositories: any[];
  scanJobs: any[];
  totalScans: number;
  totalRepositories: number;
  vulnerabilitySummary: VulnerabilitySummary;
}

export default function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string>("");

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return "bg-destructive";
      case "high":
        return "bg-orange-600";
      case "medium":
        return "bg-chart-4";
      case "low":
        return "bg-chart-2";
      default:
        return "bg-muted";
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse">
              <div className="h-6 bg-muted rounded w-1/3 mb-4"></div>
              <div className="h-32 bg-muted rounded w-full"></div>
            </div>
          </CardContent>
        </Card>
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
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Security Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(project.vulnerabilitySummary).map(
                ([severity, count]) => (
                  <div
                    key={severity}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded-full ${getSeverityColor(
                          severity
                        )}`}
                      />
                      <span className="text-sm capitalize">
                        {severity.toLowerCase()}
                      </span>
                    </div>
                    <span className="font-medium">{count}</span>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-chart-1" />
              Scan Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Scans</span>
                <span className="font-medium">{project.totalScans}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Repositories</span>
                <span className="font-medium">
                  {project.totalRepositories}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Scan</span>
                <span className="font-medium">
                  {project.lastScanAt
                    ? formatTimeAgo(project.lastScanAt)
                    : "Never"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-500" />
              Project Info
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span className="font-medium text-sm">
                  {formatDate(project.createdAt)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Updated</span>
                <span className="font-medium text-sm">
                  {formatDate(project.updatedAt)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Scans */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Recent Scans
          </CardTitle>
          <CardDescription>
            Latest security scans across all repositories
          </CardDescription>
        </CardHeader>
        <CardContent>
          {project.scanJobs.length === 0 ? (
            <div className="text-center py-8">
              <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No scans yet</p>
              <Button className="mt-4">
                <Play className="h-4 w-4 mr-2" />
                Run Your First Scan
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {project.scanJobs.slice(0, 8).map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:border-accent transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge
                        variant={
                          job.status === "COMPLETED" ? "default" : "secondary"
                        }
                      >
                        {job.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {job.finishedAt
                          ? formatDate(job.finishedAt)
                          : "In progress..."}
                      </span>
                    </div>
                    <div className="text-sm">
                      Vulnerabilities found:{" "}
                      <span className="font-medium">
                        {job.vulnerabilitiesFound || 0}
                      </span>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/scans/${job.id}`}>View Details</Link>
                  </Button>
                </div>
              ))}
              {project.scanJobs.length > 8 && (
                <div className="text-center pt-4">
                  <Button variant="outline" asChild>
                    <Link href={`/projects/${project.id}/scans`}>
                      View All Scans ({project.totalScans})
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}