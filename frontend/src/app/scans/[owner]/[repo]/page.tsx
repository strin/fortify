"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { redirect, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import Link from "next/link";
import {
  Shield,
  Clock,
  RefreshCw,
  AlertCircle,
  GitBranch,
  Bug,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowLeft,
  BarChart3,
  StopCircle,
  TrendingUp,
  Activity,
  Target,
} from "lucide-react";

interface ScanTarget {
  id: string;
  name: string;
  repoUrl: string;
  branch: string;
  subPath: string;
}

interface ScanJobSummary {
  id: string;
  type: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  finishedAt?: string;
  vulnerabilitiesFound: number;
  error?: string;
  data: any;
  vulnerabilityCounts: {
    CRITICAL: number;
    HIGH: number;
    MEDIUM: number;
    LOW: number;
    INFO: number;
  };
  categoryCounts: Record<string, number>;
  totalVulnerabilities: number;
  scanTarget: ScanTarget | null;
}

interface RepositorySummary {
  owner: string;
  repo: string;
  fullName: string;
  totalScans: number;
  totalVulnerabilities: number;
  severityCounts: {
    CRITICAL: number;
    HIGH: number;
    MEDIUM: number;
    LOW: number;
    INFO: number;
  };
  completedScans: number;
  failedScans: number;
  pendingScans: number;
  inProgressScans: number;
  lastScanned?: string;
}

const statusIcons = {
  PENDING: Clock,
  IN_PROGRESS: Loader2,
  COMPLETED: CheckCircle,
  FAILED: XCircle,
  CANCELLED: StopCircle,
};

const severityColors = {
  CRITICAL: "text-red-400",
  HIGH: "text-orange-400",
  MEDIUM: "text-yellow-400",
  LOW: "text-blue-400",
  INFO: "text-gray-400",
};

const severityBgColors = {
  CRITICAL: "bg-red-500/10 border-red-500/20",
  HIGH: "bg-orange-500/10 border-orange-500/20",
  MEDIUM: "bg-yellow-500/10 border-yellow-500/20",
  LOW: "bg-blue-500/10 border-blue-500/20",
  INFO: "bg-gray-500/10 border-gray-500/20",
};

export default async function RepositoryScansPage({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>;
}) {
  const { owner, repo } = await params;

  return <RepositoryScansContent owner={owner} repo={repo} />;
}

function RepositoryScansContent({
  owner,
  repo,
}: {
  owner: string;
  repo: string;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [summary, setSummary] = useState<RepositorySummary | null>(null);
  const [scans, setScans] = useState<ScanJobSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingJobs, setCancellingJobs] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/login");
    }
  }, [status]);

  const fetchRepositoryScans = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/scans/by-repo/${owner}/${repo}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch repository scans");
      }

      setSummary(data.summary);
      setScans(data.scans);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setLoading(false);
    }
  }, [owner, repo]);

  useEffect(() => {
    if (session) {
      fetchRepositoryScans();
    }
  }, [session, owner, repo, fetchRepositoryScans]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (startedAt?: string, finishedAt?: string) => {
    if (!startedAt) return "N/A";

    const start = new Date(startedAt);
    const end = finishedAt ? new Date(finishedAt) : new Date();
    const diff = end.getTime() - start.getTime();

    // Handle negative time differences (clock sync issues)
    if (diff < 0) {
      console.warn(
        `Negative time difference detected: start=${startedAt}, end=${
          finishedAt || "now"
        }, diff=${diff}ms`
      );
      return "0s"; // Show 0 seconds for negative differences
    }

    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  // Extract branch and repository info from scan data
  const extractScanInfo = (scanData: any) => {
    try {
      const branch = scanData?.branch || "main";
      const repoUrl = scanData?.repo_url || "";

      // Extract repository path from URL
      let repoPath = "";
      if (repoUrl) {
        // Handle both GitHub URLs and direct repo paths
        if (repoUrl.includes("github.com")) {
          const match = repoUrl.match(/github\.com[\/:]([^\/]+\/[^\/]+)/);
          repoPath = match ? match[1] : repoUrl;
        } else {
          repoPath = repoUrl;
        }
        // Remove .git suffix if present
        repoPath = repoPath.replace(/\.git$/, "");
      }

      return { branch, repoPath, repoUrl };
    } catch (error) {
      console.warn("Failed to extract scan info:", error);
      return { branch: "main", repoPath: "", repoUrl: "" };
    }
  };

  const getBranchAndPath = (scan: ScanJobSummary) => {
    // Use scanTarget data if available
    if (scan.scanTarget) {
      return {
        branch: scan.scanTarget.branch,
        subPath:
          scan.scanTarget.subPath !== "/" ? scan.scanTarget.subPath : null,
      };
    }

    // Fallback to extracting from scan.data
    if (scan.data) {
      return {
        branch: scan.data.branch || scan.data.ref || "main",
        subPath:
          scan.data.sub_path && scan.data.sub_path !== "/"
            ? scan.data.sub_path
            : null,
      };
    }

    return { branch: "main", subPath: null };
  };

  const cancelScan = async (scanId: string) => {
    try {
      setCancellingJobs((prev) => new Set(prev.add(scanId)));

      const response = await fetch(`/api/jobs/${scanId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to cancel scan");
      }

      // Refresh the scans list after successful cancellation
      await fetchRepositoryScans();
    } catch (err) {
      console.error("Error cancelling scan:", err);
      setError(err instanceof Error ? err.message : "Failed to cancel scan");
    } finally {
      setCancellingJobs((prev) => {
        const next = new Set(prev);
        next.delete(scanId);
        return next;
      });
    }
  };

  // Skeleton Loading State Component
  const SkeletonCard = () => (
    <Card className="bg-card border-border">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );

  const SkeletonScanCard = () => (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-18" />
        </div>
      </CardContent>
    </Card>
  );

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-background text-white">
        <div className="container mx-auto px-4 py-8">
          {/* Navigation Skeleton */}
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
              <Skeleton className="h-9 w-16" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <div className="flex gap-4">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-32" />
            </div>
          </div>

          {/* Summary Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>

          {/* Vulnerability Distribution Skeleton */}
          <Card className="bg-card border-border mb-8">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-6 w-48" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="text-center space-y-2">
                    <Skeleton className="h-8 w-12 mx-auto" />
                    <Skeleton className="h-4 w-16 mx-auto" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Scan History Skeleton */}
          <div className="space-y-6">
            <Skeleton className="h-7 w-32" />
            <div className="space-y-4">
              <SkeletonScanCard />
              <SkeletonScanCard />
              <SkeletonScanCard />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background text-white">
        <div className="container mx-auto px-4 py-16">
          <nav className="flex justify-between items-center mb-16">
            <h1 className="text-2xl font-bold">Repository Scans</h1>
            <Button asChild variant="outline">
              <Link href="/scans">Back to Repositories</Link>
            </Button>
          </nav>

          <div className="max-w-2xl mx-auto text-center">
            <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-400" />
            <h2 className="text-2xl font-bold mb-4">Error Loading Scans</h2>
            <p className="text-gray-300 mb-6">{error}</p>
            <Button onClick={fetchRepositoryScans} className="mr-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Navigation */}
        <nav className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Button onClick={() => router.back()} variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <GitBranch className="h-6 w-6" />
                {summary?.fullName}
              </h1>
              <p className="text-gray-400">Security scan history</p>
            </div>
          </div>
          <div className="flex gap-4">
            <Button onClick={fetchRepositoryScans} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button asChild variant="outline">
              <Link href="/scans">All Repositories</Link>
            </Button>
          </div>
        </nav>

        {/* Enhanced Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="group bg-card border-border hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-200 hover:scale-[1.02]">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground font-medium">Total Scans</p>
                    <p className="text-3xl font-bold tracking-tight">{summary.totalScans}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <TrendingUp className="h-3 w-3" />
                      <span>All time</span>
                    </div>
                  </div>
                  <div className="rounded-full bg-blue-500/10 p-3 group-hover:bg-blue-500/20 transition-colors">
                    <Shield className="h-6 w-6 text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="group bg-card border-border hover:shadow-lg hover:shadow-red-500/10 transition-all duration-200 hover:scale-[1.02]">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground font-medium">
                      Vulnerabilities
                    </p>
                    <p className="text-3xl font-bold tracking-tight">
                      {summary.totalVulnerabilities}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Bug className="h-3 w-3" />
                      <span>Issues found</span>
                    </div>
                  </div>
                  <div className="rounded-full bg-red-500/10 p-3 group-hover:bg-red-500/20 transition-colors">
                    <AlertCircle className="h-6 w-6 text-red-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="group bg-card border-border hover:shadow-lg hover:shadow-green-500/10 transition-all duration-200 hover:scale-[1.02]">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground font-medium">Completed</p>
                    <p className="text-3xl font-bold text-green-400 tracking-tight">
                      {summary.completedScans}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Activity className="h-3 w-3" />
                      <span>Successful</span>
                    </div>
                  </div>
                  <div className="rounded-full bg-green-500/10 p-3 group-hover:bg-green-500/20 transition-colors">
                    <CheckCircle className="h-6 w-6 text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="group bg-card border-border hover:shadow-lg hover:shadow-red-500/10 transition-all duration-200 hover:scale-[1.02]">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground font-medium">Critical Issues</p>
                    <p className="text-3xl font-bold text-red-400 tracking-tight">
                      {summary.severityCounts.CRITICAL}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Target className="h-3 w-3" />
                      <span>Requires attention</span>
                    </div>
                  </div>
                  <div className="rounded-full bg-red-500/10 p-3 group-hover:bg-red-500/20 transition-colors">
                    <AlertCircle className="h-6 w-6 text-red-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Enhanced Vulnerability Distribution */}
        {summary && (
          <Card className="bg-card border-border mb-8 hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-xl">
                <div className="rounded-full bg-primary/10 p-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                Vulnerability Distribution
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Security issues found across all severity levels
              </p>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="grid grid-cols-5 gap-6">
                {Object.entries(summary.severityCounts).map(
                  ([severity, count]) => {
                    const percentage = summary.totalVulnerabilities > 0 
                      ? Math.round(((count as number) / summary.totalVulnerabilities) * 100) 
                      : 0;
                    
                    return (
                      <div 
                        key={severity} 
                        className={`group relative p-4 rounded-lg border transition-all duration-200 hover:scale-105 cursor-pointer ${
                          severityBgColors[severity as keyof typeof severityBgColors]
                        }`}
                      >
                        <div className="text-center space-y-2">
                          <div
                            className={`text-3xl font-bold tracking-tight ${
                              severityColors[
                                severity as keyof typeof severityColors
                              ]
                            }`}
                          >
                            {count}
                          </div>
                          <div className="text-sm font-medium capitalize text-foreground">
                            {severity.toLowerCase()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {percentage}% of total
                          </div>
                        </div>
                        
                        {/* Progress bar */}
                        <div className="mt-3 w-full bg-muted rounded-full h-1.5">
                          <div 
                            className={`h-1.5 rounded-full transition-all duration-500 ${
                              severity === 'CRITICAL' ? 'bg-red-500' :
                              severity === 'HIGH' ? 'bg-orange-500' :
                              severity === 'MEDIUM' ? 'bg-yellow-500' :
                              severity === 'LOW' ? 'bg-blue-500' : 'bg-gray-500'
                            }`}
                            style={{ width: `${Math.max(percentage, 5)}%` }}
                          />
                        </div>
                        
                        {/* Hover tooltip */}
                        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                          <div className="bg-popover border border-border rounded-md px-3 py-1 text-xs font-medium shadow-lg">
                            {count} {severity.toLowerCase()} issues
                          </div>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Enhanced Scans List */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight">Scan History</h2>
            <Badge variant="outline" className="text-xs">
              {scans.length} scan{scans.length !== 1 ? 's' : ''}
            </Badge>
          </div>
          {scans.map((scan) => {
            const StatusIcon =
              statusIcons[scan.status as keyof typeof statusIcons];
            const { branch, repoPath } = extractScanInfo(scan.data);
            return (
              <Card
                key={scan.id}
                className="bg-card border-border hover:shadow-md hover:shadow-primary/5 transition-all duration-200 hover:scale-[1.005]"
              >
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-3 flex items-center gap-3">
                        <div className={`rounded-full p-2 ${
                          scan.status === "COMPLETED" ? "bg-green-500/10" :
                          scan.status === "FAILED" ? "bg-red-500/10" :
                          scan.status === "IN_PROGRESS" ? "bg-blue-500/10" :
                          scan.status === "CANCELLED" ? "bg-gray-500/10" : "bg-yellow-500/10"
                        }`}>
                          <StatusIcon
                            className={`h-5 w-5 ${
                              scan.status === "IN_PROGRESS" ? "animate-spin" : ""
                            } ${
                              scan.status === "COMPLETED" ? "text-green-400" :
                              scan.status === "FAILED" ? "text-red-400" :
                              scan.status === "IN_PROGRESS" ? "text-blue-400" :
                              scan.status === "CANCELLED" ? "text-gray-400" : "text-yellow-400"
                            }`}
                          />
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-base">#{scan.id.slice(-8)}</span>
                          <Badge
                            variant="secondary"
                            className={`font-medium ${
                              scan.status === "COMPLETED"
                                ? "bg-green-500/10 text-green-400 border-green-500/20"
                                : scan.status === "FAILED"
                                ? "bg-red-500/10 text-red-400 border-red-500/20"
                                : scan.status === "IN_PROGRESS"
                                ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                : scan.status === "CANCELLED"
                                ? "bg-gray-500/10 text-gray-400 border-gray-500/20"
                                : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                            }`}
                          >
                            {scan.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </CardTitle>
                      <CardDescription className="text-gray-300 text-sm">
                        <div className="space-y-2">
                          {/* Repository and branch info */}
                          <div className="flex items-center gap-4 flex-wrap">
                            {repoPath && (
                              <span className="flex items-center gap-1">
                                <Shield className="h-3 w-3" />
                                {repoPath}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <GitBranch className="h-3 w-3" />
                              {branch}
                            </span>
                          </div>
                          {/* Timing info */}
                          <div className="flex items-center gap-4 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Started: {formatDate(scan.createdAt)}
                            </span>
                            {scan.finishedAt && (
                              <span>
                                Duration:{" "}
                                {formatDuration(
                                  scan.startedAt,
                                  scan.finishedAt
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <GitBranch className="h-3 w-3" />
                            {getBranchAndPath(scan).branch}
                          </span>
                          {getBranchAndPath(scan).subPath && (
                            <span className="bg-muted px-2 py-1 rounded">
                              {getBranchAndPath(scan).subPath}
                            </span>
                          )}
                        </div>
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {scan.status === "COMPLETED" && (
                        <Button asChild>
                          <Link href={`/vulnerabilities/${scan.id}`}>
                            View Vulnerabilities
                          </Link>
                        </Button>
                      )}
                      {(scan.status === "IN_PROGRESS" ||
                        scan.status === "PENDING") && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => cancelScan(scan.id)}
                          disabled={cancellingJobs.has(scan.id)}
                        >
                          {cancellingJobs.has(scan.id) ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Cancelling...
                            </>
                          ) : (
                            <>
                              <StopCircle className="h-4 w-4 mr-2" />
                              Cancel
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {scan.status === "COMPLETED" && (
                    <div className="space-y-4">
                      {/* Vulnerability counts */}
                      <div className="flex flex-wrap gap-4">
                        {Object.entries(scan.vulnerabilityCounts).map(
                          ([severity, count]) =>
                            (count as number) > 0 && (
                              <div
                                key={severity}
                                className="flex items-center gap-2"
                              >
                                <div
                                  className={`w-3 h-3 rounded-full bg-current ${
                                    severityColors[
                                      severity as keyof typeof severityColors
                                    ]
                                  }`}
                                ></div>
                                <span
                                  className={`text-sm ${
                                    severityColors[
                                      severity as keyof typeof severityColors
                                    ]
                                  }`}
                                >
                                  {severity}: {count}
                                </span>
                              </div>
                            )
                        )}
                      </div>

                      {/* Top categories */}
                      {Object.keys(scan.categoryCounts).length > 0 && (
                        <div>
                          <p className="text-sm text-gray-400 mb-2">
                            Top Categories:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(scan.categoryCounts)
                              .sort(
                                ([, a], [, b]) => (b as number) - (a as number)
                              )
                              .slice(0, 3)
                              .map(([category, count]) => (
                                <Badge
                                  key={category}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {category.replace("_", " ")}: {count}
                                </Badge>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {scan.status === "FAILED" && scan.error && (
                    <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded">
                      <strong>Error:</strong> {scan.error}
                    </div>
                  )}

                  {scan.status === "IN_PROGRESS" && (
                    <div className="text-blue-400 text-sm">
                      Scan in progress... This may take a few minutes.
                    </div>
                  )}

                  {scan.status === "PENDING" && (
                    <div className="text-yellow-400 text-sm">
                      Scan is queued and will start shortly.
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {scans.length === 0 && !loading && (
          <EmptyState
            icon={Shield}
            title="No Scans Found"
            description={`${summary?.fullName || 'This repository'} hasn't been scanned yet. Start your first security scan to identify potential vulnerabilities and security issues.`}
            action={{
              label: "Start New Scan",
              onClick: () => router.push('/repositories'),
              icon: Shield,
              variant: "default" as const,
            }}
            secondaryAction={{
              label: "View All Repositories",
              onClick: () => router.push('/scans'),
              icon: GitBranch,
            }}
            size="lg"
            className="mt-8"
          />
        )}
      </div>
    </div>
  );
}
