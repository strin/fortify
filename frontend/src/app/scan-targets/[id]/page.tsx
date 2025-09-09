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
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  GitBranch,
  Shield,
  ExternalLink,
  Play,
  Settings,
  Trash2,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface VulnerabilityStats {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  total: number;
}

interface ScanJob {
  id: string;
  status: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  vulnerabilitiesFound: number;
  vulnerabilities: Array<{
    severity: string;
  }>;
}

interface ScanTarget {
  id: string;
  name: string;
  description: string | null;
  repoUrl: string;
  branch: string;
  subPath: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastScanAt: string | null;
  owner: string;
  repo: string;
  scanJobs: ScanJob[];
  totalScans: number;
}

export default async function ScanTargetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { data: session, status } = useSession();
  const router = useRouter();
  const [scanTarget, setScanTarget] = useState<ScanTarget | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/login");
    }
  }, [status]);

  const fetchScanTarget = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/scan-targets/${id}`);
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          router.push("/scan-targets");
          return;
        }
        throw new Error(data.error || "Failed to fetch scan target");
      }

      setScanTarget(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  const handleTriggerScan = async () => {
    try {
      setScanning(true);

      const response = await fetch(`/api/scan-targets/${id}/scan`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to trigger scan");
      }

      const data = await response.json();

      // Redirect to the job page if we got a job ID
      if (data.scanJobId) {
        router.push(`/jobs/${data.scanJobId}`);
        return;
      }

      // Fallback: refresh the scan target to show updated status
      await fetchScanTarget();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to trigger scan");
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchScanTarget();
    }
  }, [session, id, fetchScanTarget]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const formatDuration = (startedAt?: string, finishedAt?: string) => {
    if (!startedAt || !finishedAt) return "N/A";
    const start = new Date(startedAt);
    const end = new Date(finishedAt);
    const duration = Math.round((end.getTime() - start.getTime()) / 1000);
    return `${duration}s`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return (
          <Badge variant="default" className="bg-green-600">
            ✅ Completed
          </Badge>
        );
      case "FAILED":
        return <Badge variant="destructive">❌ Failed</Badge>;
      case "IN_PROGRESS":
        return <Badge variant="secondary">⏳ Running</Badge>;
      case "PENDING":
        return <Badge variant="outline">⏳ Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getVulnerabilityStats = (
    vulnerabilities: Array<{ severity: string }>
  ) => {
    return vulnerabilities.reduce(
      (acc, vuln) => {
        const severity =
          vuln.severity.toLowerCase() as keyof VulnerabilityStats;
        if (severity in acc && severity !== "total") {
          acc[severity]++;
        }
        acc.total++;
        return acc;
      },
      { critical: 0, high: 0, medium: 0, low: 0, info: 0, total: 0 }
    );
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading scan target...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-400" />
            <h2 className="text-2xl font-bold mb-4">
              Error Loading Scan Target
            </h2>
            <p className="text-gray-300 mb-6">{error}</p>
            <div className="flex gap-4 justify-center">
              <Button onClick={fetchScanTarget}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button asChild variant="outline">
                <Link href="/scan-targets">Back to Scan Targets</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!scanTarget) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="sm">
              <Link href="/scan-targets">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Scan Targets
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Shield className="h-8 w-8 text-blue-400" />
                {scanTarget.name}
                {!scanTarget.isActive && (
                  <Badge variant="outline">Inactive</Badge>
                )}
              </h1>
              <p className="text-gray-400 mt-1">
                {scanTarget.owner}/{scanTarget.repo} • {scanTarget.branch}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleTriggerScan}
              disabled={!scanTarget.isActive || scanning}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {scanning ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              {scanning ? "Scanning..." : "Scan Now"}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Settings className="h-4 w-4 mr-2" />
                  Edit Settings
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a
                    href={scanTarget.repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Repository
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem className="text-red-400">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Target
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-400">
                Total Scans
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {scanTarget.totalScans}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-400">Last Scan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-white">
                {formatDate(scanTarget.lastScanAt)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-400">Created</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-white">
                {formatDate(scanTarget.createdAt)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Configuration Details */}
        <Card className="bg-gray-800 border-gray-700 mb-8">
          <CardHeader>
            <CardTitle className="text-white">Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {scanTarget.description && (
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-1">
                  Description
                </h4>
                <p className="text-white">{scanTarget.description}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-1">
                  Repository URL
                </h4>
                <a
                  href={scanTarget.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline flex items-center gap-1"
                >
                  {scanTarget.repoUrl}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-1">
                  Branch
                </h4>
                <div className="flex items-center gap-1 text-white">
                  <GitBranch className="h-3 w-3" />
                  {scanTarget.branch}
                </div>
              </div>

              {scanTarget.subPath && (
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-1">
                    Sub-path
                  </h4>
                  <p className="text-white">{scanTarget.subPath}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Scans */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Recent Scans</CardTitle>
            <CardDescription className="text-gray-400">
              Latest scan results for this target
            </CardDescription>
          </CardHeader>
          <CardContent>
            {scanTarget.scanJobs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400">No scans yet</p>
                <Button
                  onClick={handleTriggerScan}
                  disabled={!scanTarget.isActive || scanning}
                  className="mt-4 bg-blue-600 hover:bg-blue-700"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Run First Scan
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {scanTarget.scanJobs.map((scan) => {
                  const vulnStats = getVulnerabilityStats(
                    scan.vulnerabilities || []
                  );

                  return (
                    <div
                      key={scan.id}
                      className="flex items-center justify-between p-4 bg-gray-750 rounded-lg border border-gray-600"
                    >
                      <div className="flex items-center gap-4">
                        <div>{getStatusBadge(scan.status)}</div>
                        <div>
                          <p className="text-white font-medium">
                            Scan {scan.id.slice(0, 8)}
                          </p>
                          <p className="text-sm text-gray-400">
                            {formatDate(scan.createdAt)}
                            {scan.startedAt && scan.finishedAt && (
                              <span>
                                {" "}
                                • Duration:{" "}
                                {formatDuration(
                                  scan.startedAt,
                                  scan.finishedAt
                                )}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {scan.status === "COMPLETED" && (
                          <div className="flex gap-1">
                            {vulnStats.critical > 0 && (
                              <Badge variant="destructive">
                                {vulnStats.critical} Critical
                              </Badge>
                            )}
                            {vulnStats.high > 0 && (
                              <Badge
                                variant="destructive"
                                className="bg-orange-600"
                              >
                                {vulnStats.high} High
                              </Badge>
                            )}
                            {vulnStats.medium > 0 && (
                              <Badge variant="secondary">
                                {vulnStats.medium} Medium
                              </Badge>
                            )}
                            {vulnStats.low > 0 && (
                              <Badge variant="outline">
                                {vulnStats.low} Low
                              </Badge>
                            )}
                            {vulnStats.total === 0 && (
                              <Badge
                                variant="outline"
                                className="text-green-600"
                              >
                                No vulnerabilities
                              </Badge>
                            )}
                          </div>
                        )}

                        <Button asChild variant="outline" size="sm">
                          <Link href={`/vulnerabilities/${scan.id}`}>
                            View Details
                          </Link>
                        </Button>
                      </div>
                    </div>
                  );
                })}

                {scanTarget.totalScans > scanTarget.scanJobs.length && (
                  <div className="text-center pt-4">
                    <Button asChild variant="outline">
                      <Link
                        href={`/scans/${scanTarget.owner}/${scanTarget.repo}`}
                      >
                        View All Scans ({scanTarget.totalScans})
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
