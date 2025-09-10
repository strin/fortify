"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  FileText,
  GitBranch,
  Github,
  Loader2,
  Play,
  Settings,
  Shield,
  Target,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Repository {
  id: string;
  fullName: string;
  description: string | null;
  provider: string;
  defaultBranch: string;
  isPrivate: boolean;
  lastScanAt: string | null;
  repoUrl: string;
  scanTargets: ScanTarget[];
  totalScanTargets: number;
}

interface ScanTarget {
  id: string;
  name: string;
  branch: string;
  subPath: string | null;
  lastScanAt: string | null;
  scanJobs: ScanJob[];
}

interface ScanJob {
  id: string;
  status: string;
  vulnerabilitiesFound: number;
  finishedAt: string | null;
}

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
  repositories: Repository[];
  scanJobs: any[];
  totalScans: number;
  totalRepositories: number;
  vulnerabilitySummary: VulnerabilitySummary;
}

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string>("");

  // Get project ID from params
  useEffect(() => {
    params.then((p) => setProjectId(p.id));
  }, [params]);

  // Check authentication and fetch project
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated" && projectId) {
      fetchProject();
    }
  }, [status, router, projectId]);

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

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-background text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-8">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-64" />
          </div>

          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <Skeleton className="h-8 w-48 mb-2" />
                <Skeleton className="h-5 w-80" />
              </div>
              <div className="flex gap-3">
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-24" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Skeleton className="h-4 w-20 mb-2" />
                        <Skeleton className="h-8 w-12" />
                      </div>
                      <Skeleton className="h-8 w-8" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="bg-card border-border">
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated" || error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 mx-auto mb-4 text-destructive" />
          <h2 className="text-xl font-semibold mb-2 text-foreground">
            {error || "Access Denied"}
          </h2>
          <p className="text-muted-foreground mb-4">
            {error || "You need to be logged in to view this project."}
          </p>
          <Button onClick={() => router.push("/projects")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Link href="/projects">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Projects
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">{project.name}</h1>
                {project.repositories.length > 0 && (
                  <div className="flex items-center gap-2">
                    {project.repositories.map((repo, index) => (
                      <div key={repo.id} className="flex items-center gap-1">
                        {index > 0 && (
                          <span className="text-muted-foreground">•</span>
                        )}
                        <a
                          href={
                            repo.provider === "GITHUB"
                              ? `https://github.com/${repo.fullName}`
                              : repo.repoUrl
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted hover:bg-accent transition-colors text-sm text-muted-foreground hover:text-foreground"
                          title={`Open ${
                            repo.fullName
                          } on ${repo.provider.toLowerCase()}`}
                        >
                          <Github className="h-3 w-3" />
                          <span>{repo.fullName}</span>
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <Button variant="cta">
              <Play className="h-4 w-4 mr-2" />
              Run Scan
            </Button>
          </div>

          {project.description && (
            <p className="text-muted-foreground">{project.description}</p>
          )}
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="scans">Scans</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
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
                      <span className="text-muted-foreground">
                        Repositories
                      </span>
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

            {/* Recent Scans - Now prominently displayed */}
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
                                job.status === "COMPLETED"
                                  ? "default"
                                  : "secondary"
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
                          <Link href={`/projects/${project.id}?tab=scans`}>
                            View All Scans ({project.totalScans})
                          </Link>
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Scans Tab */}
          <TabsContent value="scans">
            <Card>
              <CardHeader>
                <CardTitle>All Scans</CardTitle>
                <CardDescription>
                  Comprehensive list of all security scans for this project
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Scans view coming soon
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Compliance Tab */}
          <TabsContent value="compliance">
            <Card>
              <CardHeader>
                <CardTitle>Compliance Reporting</CardTitle>
                <CardDescription>
                  Generate compliance evidence and reports
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">
                    Compliance reporting is coming soon. You&apos;ll be able to
                    generate evidence for SOC2, ISO, and HIPAA directly from
                    your scan history.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
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
                      <Button
                        size="sm"
                        className="bg-primary hover:bg-primary/90"
                      >
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
                              <span>
                                Last Scan: {formatTimeAgo(repo.lastScanAt)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
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
                    configure automatic scans, notifications, and security
                    policies.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
