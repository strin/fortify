"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  ArrowLeft,
  RefreshCw,
  FileSearch,
  Shield,
  Bug,
  GitBranch,
  FolderTree,
  Github,
  Download,
  Share2,
  Play,
  Eye,
  RotateCcw,
} from "lucide-react";

interface JobStatus {
  job_id: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  type: string;
  created_at: string;
  updated_at: string;
  started_at?: string;
  finished_at?: string;
  data?: {
    repo_url?: string;
    branch?: string;
    path?: string;
  };
  result?: {
    vulnerabilities_found?: number;
    files_scanned?: number;
    scan_duration?: number;
    engine_version?: string;
    vulnerabilities?: Array<{
      severity: string;
      title: string;
      file_path: string;
      category?: string;
    }>;
    vulnerability_summary?: {
      CRITICAL: number;
      HIGH: number;
      MEDIUM: number;
      LOW: number;
      INFO: number;
    };
  };
  error?: string;
}

const statusConfig = {
  PENDING: {
    icon: Clock,
    color: "bg-yellow-500",
    bgColor: "bg-yellow-50",
    textColor: "text-yellow-700",
    label: "Pending",
    description: "Scan job is queued and waiting to start",
  },
  IN_PROGRESS: {
    icon: RefreshCw,
    color: "bg-blue-500",
    bgColor: "bg-blue-50",
    textColor: "text-blue-700",
    label: "In Progress",
    description: "Actively scanning your code for vulnerabilities",
  },
  COMPLETED: {
    icon: CheckCircle,
    color: "bg-green-500",
    bgColor: "bg-green-50",
    textColor: "text-green-700",
    label: "Completed",
    description: "Scan completed successfully",
  },
  FAILED: {
    icon: XCircle,
    color: "bg-red-500",
    bgColor: "bg-red-50",
    textColor: "text-red-700",
    label: "Failed",
    description: "Scan encountered an error",
  },
};

export default function ScanJobPage() {
  const params = useParams();
  const router = useRouter();
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const jobId = params?.jobId as string;

  const fetchJobStatus = useCallback(async () => {
    if (!jobId) return;

    try {
      setError(null);
      const response = await fetch(`/api/jobs/${jobId}`);

      if (!response.ok) {
        if (response.status === 404) {
          setError("Job not found");
          return;
        }
        throw new Error("Failed to fetch job status");
      }

      const data = await response.json();
      setJobStatus(data);
    } catch (err) {
      console.error("Error fetching job status:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch job status"
      );
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchJobStatus();

    // Poll for updates if job is still running
    const interval = setInterval(() => {
      if (
        jobStatus?.status === "PENDING" ||
        jobStatus?.status === "IN_PROGRESS"
      ) {
        fetchJobStatus();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [jobId, jobStatus?.status, fetchJobStatus]);

  const getProgress = () => {
    if (!jobStatus) return 0;
    switch (jobStatus.status) {
      case "PENDING":
        return 10;
      case "IN_PROGRESS":
        return 50;
      case "COMPLETED":
        return 100;
      case "FAILED":
        return 100;
      default:
        return 0;
    }
  };

  const getRepoInfo = () => {
    if (!jobStatus?.data?.repo_url) return { owner: "", repo: "" };
    const url = jobStatus.data.repo_url;
    const match = url.match(/github\.com[/:](.*?)\/(.*?)(?:\.git|$)/);
    if (match) {
      return { owner: match[1], repo: match[2] };
    }
    return { owner: "", repo: url };
  };

  const getCurrentStage = () => {
    if (!jobStatus) return "";
    switch (jobStatus.status) {
      case "PENDING":
        return "Queued for scanning";
      case "IN_PROGRESS":
        return "Analyzing code";
      case "COMPLETED":
        return "Scan completed";
      case "FAILED":
        return "Scan failed";
      default:
        return "";
    }
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diff = end.getTime() - start.getTime();
    
    // Handle negative time differences (clock sync issues)
    if (diff < 0) {
      console.warn(`Negative time difference detected: start=${startTime}, end=${endTime || 'now'}, diff=${diff}ms`);
      return "0s"; // Show 0 seconds for negative differences
    }
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);

    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-blue-100 text-blue-800";
      case "info":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-10 w-10 rounded" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-96" />
            </div>
          </div>

          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <div className="mt-6">
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Go Back</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!jobStatus) return null;

  const config = statusConfig[jobStatus.status];
  const StatusIcon = config.icon;
  const repoInfo = getRepoInfo();

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.back()}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Project</span>
            </Button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-3xl font-bold">Scan Job</h1>
                <Badge className={`${config.color} text-white`}>
                  {jobStatus.status.replace('_', ' ')}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-muted-foreground">
                <span>ID: {jobStatus.job_id}</span>
                {repoInfo.owner && (
                  <div className="flex items-center gap-1">
                    <Github className="h-4 w-4" />
                    <span>{repoInfo.owner}/{repoInfo.repo}</span>
                  </div>
                )}
                {jobStatus.data?.branch && (
                  <div className="flex items-center gap-1">
                    <GitBranch className="h-4 w-4" />
                    <span>{jobStatus.data.branch}</span>
                  </div>
                )}
                <span>{new Date(jobStatus.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchJobStatus}
              disabled={loading}
              className="flex items-center space-x-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>
            {jobStatus.status === "IN_PROGRESS" && (
              <Button
                variant="destructive"
                size="sm"
                className="flex items-center space-x-2"
              >
                <XCircle className="h-4 w-4" />
                <span>Cancel Scan</span>
              </Button>
            )}
          </div>
        </div>

        {/* Summary Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-full ${config.bgColor}`}>
                <StatusIcon className={`h-6 w-6 ${config.textColor}`} />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl">{config.label}</CardTitle>
                <CardDescription className="mt-1">
                  {getCurrentStage()}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Progress for In Progress jobs */}
            {(jobStatus.status === "PENDING" || jobStatus.status === "IN_PROGRESS") && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{getProgress()}%</span>
                </div>
                <Progress value={getProgress()} className="h-2" />
              </div>
            )}

            {/* Time Information */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">Created</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(jobStatus.created_at).toLocaleDateString()}
                </p>
              </div>

              {jobStatus.started_at && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Started</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(jobStatus.started_at).toLocaleDateString()}
                  </p>
                </div>
              )}

              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {jobStatus.status === "IN_PROGRESS" ? "Time Elapsed" : "Duration"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatDuration(
                    jobStatus.started_at || jobStatus.created_at,
                    jobStatus.status === "COMPLETED" || jobStatus.status === "FAILED"
                      ? jobStatus.finished_at || jobStatus.updated_at
                      : undefined
                  )}
                </p>
              </div>

              {jobStatus.status === "IN_PROGRESS" && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Est. Remaining</p>
                  <p className="text-sm text-muted-foreground">2-3 min</p>
                </div>
              )}
            </div>

            {/* Configuration Summary */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3">Scan Configuration</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Github className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Repository:</span>
                  <span className="font-medium">{repoInfo.owner}/{repoInfo.repo}</span>
                </div>
                
                {jobStatus.data?.branch && (
                  <div className="flex items-center gap-2">
                    <GitBranch className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Branch:</span>
                    <span className="font-medium">{jobStatus.data.branch}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <FolderTree className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Path:</span>
                  <span className="font-medium">{jobStatus.data?.path || "/"}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Card - For Failed Scans */}
        {jobStatus.status === "FAILED" && (
          <Card className="border-red-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-red-700 flex items-center space-x-2">
                  <XCircle className="h-5 w-5" />
                  <span>Scan Failed</span>
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Retry Scan</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Error Information */}
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-red-800">Error Type</p>
                  <p className="text-sm text-muted-foreground">
                    {jobStatus.error?.includes("timeout") ? "Timeout Error" :
                     jobStatus.error?.includes("access") ? "Repository Access Error" :
                     jobStatus.error?.includes("branch") ? "Branch Not Found" :
                     "Analysis Error"}
                  </p>
                </div>
                
                {jobStatus.error && (
                  <div>
                    <p className="text-sm font-medium text-red-800">Error Message</p>
                    <div className="bg-red-50 p-3 rounded-lg mt-1">
                      <p className="text-red-800 text-sm font-mono">
                        {jobStatus.error}
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium text-red-800">Troubleshooting</p>
                  <div className="text-sm text-muted-foreground mt-1 space-y-1">
                    {jobStatus.error?.includes("timeout") && (
                      <p>• Try scanning a smaller path or contact support for large repositories</p>
                    )}
                    {jobStatus.error?.includes("access") && (
                      <>
                        <p>• Check that your GitHub access token is valid</p>
                        <p>• Verify the repository exists and you have access to it</p>
                      </>
                    )}
                    {jobStatus.error?.includes("branch") && (
                      <>
                        <p>• Verify the branch name is correct</p>
                        <p>• Check that the branch exists in the repository</p>
                      </>
                    )}
                    {!jobStatus.error?.includes("timeout") && !jobStatus.error?.includes("access") && !jobStatus.error?.includes("branch") && (
                      <>
                        <p>• Check the file types in your repository</p>
                        <p>• Some files may be corrupted or unsupported</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Button className="flex items-center space-x-2">
                  <RotateCcw className="h-4 w-4" />
                  <span>Retry Scan</span>
                </Button>
                <Button variant="outline" className="flex items-center space-x-2">
                  <Play className="h-4 w-4" />
                  <span>Modify and Retry</span>
                </Button>
                <Button variant="outline" onClick={() => router.back()}>
                  View Project
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results Section - For Completed Scans */}
        {jobStatus.status === "COMPLETED" && jobStatus.result && (
          <>
            {/* Vulnerability Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>Scan Results Summary</span>
                </CardTitle>
                {jobStatus.result.vulnerability_summary && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {jobStatus.result.vulnerability_summary.CRITICAL > 0 && (
                      <Badge variant="destructive">
                        {jobStatus.result.vulnerability_summary.CRITICAL} Critical
                      </Badge>
                    )}
                    {jobStatus.result.vulnerability_summary.HIGH > 0 && (
                      <Badge variant="destructive" className="bg-orange-600">
                        {jobStatus.result.vulnerability_summary.HIGH} High
                      </Badge>
                    )}
                    {jobStatus.result.vulnerability_summary.MEDIUM > 0 && (
                      <Badge variant="secondary">
                        {jobStatus.result.vulnerability_summary.MEDIUM} Medium
                      </Badge>
                    )}
                    {jobStatus.result.vulnerability_summary.LOW > 0 && (
                      <Badge variant="outline">
                        {jobStatus.result.vulnerability_summary.LOW} Low
                      </Badge>
                    )}
                    {(jobStatus.result.vulnerabilities_found || 0) === 0 && (
                      <Badge variant="outline" className="text-green-600">
                        No vulnerabilities found
                      </Badge>
                    )}
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {/* Quick Actions */}
                <div className="flex flex-wrap gap-3 mb-6">
                  <Button
                    onClick={() => router.push(`/vulnerabilities/${jobStatus.job_id}`)}
                    className="flex items-center space-x-2"
                  >
                    <Eye className="h-4 w-4" />
                    <span>View All Vulnerabilities</span>
                  </Button>
                  <Button variant="outline" className="flex items-center space-x-2">
                    <Download className="h-4 w-4" />
                    <span>Export Results</span>
                  </Button>
                  <Button variant="outline" className="flex items-center space-x-2">
                    <Share2 className="h-4 w-4" />
                    <span>Share Report</span>
                  </Button>
                  <Button variant="outline" className="flex items-center space-x-2">
                    <Play className="h-4 w-4" />
                    <span>Run New Scan</span>
                  </Button>
                </div>

                {/* Scan Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 rounded-full bg-blue-50">
                      <FileSearch className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xl font-bold">
                        {jobStatus.result.files_scanned || 0}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Files Scanned
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="p-3 rounded-full bg-red-50">
                      <Bug className="h-6 w-6 text-red-600" />
                    </div>
                    <div>
                      <p className="text-xl font-bold">
                        {jobStatus.result.vulnerabilities_found || 0}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Vulnerabilities Found
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="p-3 rounded-full bg-green-50">
                      <Clock className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xl font-bold">
                        {Math.round((jobStatus.result.scan_duration || 0) / 1000)}s
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Scan Duration
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="p-3 rounded-full bg-purple-50">
                      <Shield className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xl font-bold">
                        {jobStatus.result?.engine_version || "Claude v2.1"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Analysis Engine
                      </p>
                    </div>
                  </div>
                </div>

                {/* Top Vulnerabilities Preview */}
                {jobStatus.result.vulnerabilities &&
                  jobStatus.result.vulnerabilities.length > 0 && (
                    <div className="mt-6 border-t pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold">Top Findings</h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            router.push(`/vulnerabilities/${jobStatus.job_id}`)
                          }
                        >
                          View All {jobStatus.result.vulnerabilities.length}
                        </Button>
                      </div>
                      <div className="space-y-3">
                        {jobStatus.result.vulnerabilities
                          .slice(0, 3)
                          .map((vuln, index) => (
                            <div
                              key={index}
                              className="flex items-start justify-between p-4 bg-muted rounded-lg hover:bg-accent transition-colors"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <AlertCircle className="h-4 w-4 text-red-500" />
                                  <p className="font-medium text-sm truncate">
                                    {vuln.title}
                                  </p>
                                </div>
                                <p className="text-xs text-muted-foreground truncate">
                                  {vuln.file_path}
                                </p>
                                {vuln.category && (
                                  <Badge variant="outline" className="text-xs mt-2">
                                    {vuln.category.replace('_', ' ').toLowerCase()}
                                  </Badge>
                                )}
                              </div>
                              <Badge className={getSeverityColor(vuln.severity)}>
                                {vuln.severity}
                              </Badge>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
              </CardContent>
            </Card>
          </>
        )}

      </div>
    </div>
  );
}
