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

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-background text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading repository scans...</p>
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

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Total Scans</p>
                    <p className="text-2xl font-bold">{summary.totalScans}</p>
                  </div>
                  <Shield className="h-8 w-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">
                      Total Vulnerabilities
                    </p>
                    <p className="text-2xl font-bold">
                      {summary.totalVulnerabilities}
                    </p>
                  </div>
                  <Bug className="h-8 w-8 text-red-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Completed</p>
                    <p className="text-2xl font-bold text-green-400">
                      {summary.completedScans}
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Critical Issues</p>
                    <p className="text-2xl font-bold text-red-400">
                      {summary.severityCounts.CRITICAL}
                    </p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-red-400" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Severity Distribution */}
        {summary && (
          <Card className="bg-gray-800 border-gray-700 mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Vulnerability Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-4">
                {Object.entries(summary.severityCounts).map(
                  ([severity, count]) => (
                    <div key={severity} className="text-center">
                      <div
                        className={`text-2xl font-bold ${
                          severityColors[
                            severity as keyof typeof severityColors
                          ]
                        }`}
                      >
                        {count}
                      </div>
                      <div className="text-sm text-gray-400 capitalize">
                        {severity.toLowerCase()}
                      </div>
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Scans List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold mb-4">Scan History</h2>
          {scans.map((scan) => {
            const StatusIcon =
              statusIcons[scan.status as keyof typeof statusIcons];
            const { branch, repoPath } = extractScanInfo(scan.data);
            return (
              <Card
                key={scan.id}
                className="bg-card border-border hover:bg-accent transition-colors"
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg text-white mb-2 flex items-center gap-2">
                        <StatusIcon
                          className={`h-5 w-5 ${
                            scan.status === "IN_PROGRESS" ? "animate-spin" : ""
                          }`}
                        />
                        Scan #{scan.id.slice(-8)}
                        <Badge
                          variant="outline"
                          className={`${
                            scan.status === "COMPLETED"
                              ? "text-green-400 border-green-400"
                              : scan.status === "FAILED"
                              ? "text-red-400 border-red-400"
                              : scan.status === "IN_PROGRESS"
                              ? "text-blue-400 border-blue-400"
                              : scan.status === "CANCELLED"
                              ? "text-gray-400 border-gray-400"
                              : "text-yellow-400 border-yellow-400"
                          } border-current`}
                        >
                          {scan.status}
                        </Badge>
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
          <div className="text-center py-16">
            <Shield className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-semibold mb-2">No Scans Found</h2>
            <p className="text-gray-400 text-lg mb-6">
              This repository hasn&apos;t been scanned yet.
            </p>
            <Button asChild>
              <Link href="/repositories">
                <Shield className="h-4 w-4 mr-2" />
                Start a New Scan
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
