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
import { Progress } from "@/components/ui/progress";
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
  FolderTree,
  StopCircle,
  Calendar,
  Timer,
  FileText,
  AlertTriangle,
} from "lucide-react";

interface ScanJobDetails {
  id: string;
  type: string;
  status: string;
  data: any;
  result: any;
  error?: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  finishedAt?: string;
  vulnerabilitiesFound: number;
  timeElapsedMs: number;
  vulnerabilityCounts: {
    CRITICAL: number;
    HIGH: number;
    MEDIUM: number;
    LOW: number;
    INFO: number;
  };
  categoryCounts: Record<string, number>;
  totalVulnerabilities: number;
  project?: {
    id: string;
    name: string;
    description?: string;
  };
  scanTarget?: {
    id: string;
    name: string;
    description?: string;
    repoUrl: string;
    branch: string;
    subPath?: string;
    repository?: {
      id: string;
      fullName: string;
      description?: string;
    };
  };
}

const statusIcons = {
  PENDING: Clock,
  IN_PROGRESS: Loader2,
  COMPLETED: CheckCircle,
  FAILED: XCircle,
};

const statusColors = {
  PENDING: "text-yellow-400 border-yellow-400",
  IN_PROGRESS: "text-blue-400 border-blue-400",
  COMPLETED: "text-green-400 border-green-400",
  FAILED: "text-red-400 border-red-400",
};

const severityColors = {
  CRITICAL: "text-red-400",
  HIGH: "text-orange-400", 
  MEDIUM: "text-yellow-400",
  LOW: "text-blue-400",
  INFO: "text-gray-400",
};

export default function ScanJobPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  return <ScanJobPageContent params={params} />;
}

function ScanJobPageContent({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [jobId, setJobId] = useState<string | null>(null);
  const [scanJob, setScanJob] = useState<ScanJobDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // Resolve params
  useEffect(() => {
    params.then((resolvedParams) => setJobId(resolvedParams.jobId));
  }, [params]);

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/login");
    }
  }, [status]);

  const fetchScanJob = useCallback(async () => {
    if (!jobId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/scans/${jobId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch scan job");
      }

      setScanJob(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  const cancelScan = async () => {
    if (!jobId || !scanJob || cancelling) return;

    try {
      setCancelling(true);
      const response = await fetch(`/api/scans/${jobId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to cancel scan");
      }

      // Refresh the scan job data
      await fetchScanJob();
    } catch (err) {
      console.error("Error cancelling scan:", err);
      setError(
        err instanceof Error ? err.message : "Failed to cancel scan"
      );
    } finally {
      setCancelling(false);
    }
  };

  useEffect(() => {
    if (session && jobId) {
      fetchScanJob();
    }
  }, [session, jobId, fetchScanJob]);

  // Auto-refresh for in-progress scans
  useEffect(() => {
    if (scanJob?.status === "IN_PROGRESS") {
      const interval = setInterval(fetchScanJob, 10000); // Refresh every 10 seconds
      return () => clearInterval(interval);
    }
  }, [scanJob?.status, fetchScanJob]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getCurrentStage = (status: string, startedAt?: string) => {
    if (status === "PENDING") return "Queued for processing";
    if (status === "IN_PROGRESS") {
      if (startedAt) {
        const elapsed = Date.now() - new Date(startedAt).getTime();
        if (elapsed < 30000) return "Cloning repository";
        if (elapsed < 120000) return "Analyzing code";
        return "Generating report";
      }
      return "Processing";
    }
    if (status === "COMPLETED") return "Scan completed";
    if (status === "FAILED") return "Scan failed";
    return "Unknown";
  };

  const getProgressPercentage = (status: string, startedAt?: string) => {
    if (status === "PENDING") return 0;
    if (status === "COMPLETED") return 100;
    if (status === "FAILED") return 0;
    if (status === "IN_PROGRESS" && startedAt) {
      const elapsed = Date.now() - new Date(startedAt).getTime();
      if (elapsed < 30000) return 25; // Cloning
      if (elapsed < 120000) return 65; // Analyzing
      return 90; // Generating report
    }
    return 50;
  };

  if (status === "loading" || loading || !scanJob) {
    return (
      <div className="min-h-screen bg-background text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading scan job details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background text-white">
        <div className="container mx-auto px-4 py-16">
          <nav className="flex justify-between items-center mb-16">
            <h1 className="text-2xl font-bold">Scan Job</h1>
            <Button onClick={() => router.back()} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </nav>

          <div className="max-w-2xl mx-auto text-center">
            <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-400" />
            <h2 className="text-2xl font-bold mb-4">Error Loading Scan</h2>
            <p className="text-gray-300 mb-6">{error}</p>
            <Button onClick={fetchScanJob} className="mr-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const StatusIcon = statusIcons[scanJob.status as keyof typeof statusIcons];
  const canCancel = scanJob.status === "PENDING" || scanJob.status === "IN_PROGRESS";
  const isInProgress = scanJob.status === "IN_PROGRESS";

  return (
    <div className="min-h-screen bg-background text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-center gap-4">
            <Button 
              onClick={() => scanJob.project?.id ? router.push(`/projects/${scanJob.project.id}`) : router.back()} 
              variant="outline" 
              size="sm"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {scanJob.project?.name ? `Back to ${scanJob.project.name}` : 'Back'}
            </Button>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-2xl font-bold">
                  Scan #{scanJob.id.slice(-8)}
                </h1>
                <Badge
                  variant="outline"
                  className={`${statusColors[scanJob.status as keyof typeof statusColors]} border-current`}
                >
                  <StatusIcon 
                    className={`h-4 w-4 mr-1 ${isInProgress ? 'animate-spin' : ''}`} 
                  />
                  {scanJob.status}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-gray-400 text-sm">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Created: {formatDate(scanJob.createdAt)}
                </div>
                {scanJob.startedAt && (
                  <div className="flex items-center gap-1">
                    <Timer className="h-4 w-4" />
                    Started: {formatDate(scanJob.startedAt)}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={fetchScanJob} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            {canCancel && (
              <Button
                onClick={cancelScan}
                variant="destructive"
                size="sm"
                disabled={cancelling}
              >
                {cancelling ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <StopCircle className="h-4 w-4 mr-2" />
                )}
                Cancel Scan
              </Button>
            )}
            {scanJob.status === "COMPLETED" && (
              <Button asChild>
                <Link href={`/vulnerabilities/${scanJob.id}`}>
                  <Bug className="h-4 w-4 mr-2" />
                  View Vulnerabilities
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Summary Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Status & Progress */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <StatusIcon className={`h-5 w-5 ${isInProgress ? 'animate-spin' : ''}`} />
                Scan Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-300">
                      {getCurrentStage(scanJob.status, scanJob.startedAt)}
                    </span>
                    <span className="text-sm text-gray-400">
                      {getProgressPercentage(scanJob.status, scanJob.startedAt)}%
                    </span>
                  </div>
                  <Progress 
                    value={getProgressPercentage(scanJob.status, scanJob.startedAt)} 
                    className="h-2"
                  />
                </div>
                
                {scanJob.startedAt && (
                  <div className="text-sm text-gray-300">
                    <span className="text-gray-400">Time Elapsed:</span>{" "}
                    {formatDuration(scanJob.timeElapsedMs)}
                  </div>
                )}
                
                {scanJob.status === "IN_PROGRESS" && (
                  <div className="text-sm text-blue-400">
                    <Loader2 className="h-4 w-4 inline mr-1" />
                    Scan in progress... This may take a few minutes.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Configuration Summary */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderTree className="h-5 w-5" />
                Scan Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {scanJob.scanTarget?.repository && (
                  <div className="flex items-start gap-2">
                    <GitBranch className="h-4 w-4 mt-0.5 text-gray-400" />
                    <div>
                      <div className="text-sm font-medium">
                        {scanJob.scanTarget.repository.fullName}
                      </div>
                      {scanJob.scanTarget.repository.description && (
                        <div className="text-xs text-gray-400">
                          {scanJob.scanTarget.repository.description}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-blue-600 flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-sm"></div>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-400">Branch:</span>{" "}
                    <span className="font-mono">{scanJob.scanTarget?.branch}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <FolderTree className="h-4 w-4 text-gray-400" />
                  <div className="text-sm">
                    <span className="text-gray-400">Path:</span>{" "}
                    <span className="font-mono">
                      {scanJob.scanTarget?.subPath || "/"}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results Section */}
        {scanJob.status === "COMPLETED" && (
          <div className="space-y-6">
            {/* Vulnerability Summary */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bug className="h-5 w-5" />
                  Vulnerability Summary
                </CardTitle>
                <CardDescription>
                  {scanJob.totalVulnerabilities} vulnerabilities found
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-4">
                  {Object.entries(scanJob.vulnerabilityCounts).map(
                    ([severity, count]) => (
                      <div key={severity} className="text-center">
                        <div
                          className={`text-3xl font-bold ${
                            severityColors[severity as keyof typeof severityColors]
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

                {/* Top Categories */}
                {Object.keys(scanJob.categoryCounts).length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-gray-300 mb-3">
                      Top Vulnerability Categories
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(scanJob.categoryCounts)
                        .sort(([, a], [, b]) => (b as number) - (a as number))
                        .slice(0, 5)
                        .map(([category, count]) => (
                          <Badge key={category} variant="outline" className="text-xs">
                            {category.replace("_", " ")}: {count}
                          </Badge>
                        ))}
                    </div>
                  </div>
                )}

                <div className="mt-6">
                  <Button asChild className="w-full">
                    <Link href={`/vulnerabilities/${scanJob.id}`}>
                      <FileText className="h-4 w-4 mr-2" />
                      View Detailed Vulnerability Report
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Error Section */}
        {scanJob.status === "FAILED" && scanJob.error && (
          <Card className="bg-red-900/20 border-red-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="h-5 w-5" />
                Scan Failed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-red-300 mb-4">
                <strong>Error:</strong> {scanJob.error}
              </div>
              
              <div className="space-y-2 text-sm text-gray-300">
                <p><strong>Common solutions:</strong></p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Verify that the repository is accessible with your GitHub token</li>
                  <li>Check that the branch exists in the repository</li>
                  <li>Ensure the specified path exists in the branch</li>
                  <li>Try scanning a smaller path if the repository is very large</li>
                </ul>
              </div>

              <div className="mt-4 flex gap-2">
                <Button
                  onClick={() => {
                    // TODO: Implement retry with same configuration
                    console.log("Retry scan");
                  }}
                  variant="outline"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry Scan
                </Button>
                {scanJob.project?.id && (
                  <Button asChild variant="outline">
                    <Link href={`/projects/${scanJob.project.id}`}>
                      Create New Scan
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pending State */}
        {scanJob.status === "PENDING" && (
          <Card className="bg-yellow-900/20 border-yellow-700">
            <CardContent className="pt-6">
              <div className="text-center">
                <Clock className="h-12 w-12 mx-auto mb-4 text-yellow-400" />
                <h3 className="text-lg font-semibold mb-2">Scan Queued</h3>
                <p className="text-gray-300">
                  Your scan is queued and will start processing shortly. 
                  This page will automatically refresh to show progress.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}