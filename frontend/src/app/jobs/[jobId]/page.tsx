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
} from "lucide-react";

interface JobStatus {
  job_id: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  type: string;
  created_at: string;
  updated_at: string;
  result?: {
    vulnerabilities_found?: number;
    files_scanned?: number;
    scan_duration?: number;
    vulnerabilities?: Array<{
      severity: string;
      title: string;
      file_path: string;
    }>;
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

  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diff = end.getTime() - start.getTime();
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
  console.log("config", config, jobStatus.status);
  const StatusIcon = config.icon;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
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
              <span>Back</span>
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Scan Job</h1>
              <p className="text-muted-foreground">
                Job ID: {jobStatus.job_id}
              </p>
            </div>
          </div>

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
        </div>

        {/* Status Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-full ${config.bgColor}`}>
                <StatusIcon className={`h-6 w-6 ${config.textColor}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <CardTitle className="text-xl">{config.label}</CardTitle>
                  <Badge className={`${config.color} text-white`}>
                    {jobStatus.status}
                  </Badge>
                </div>
                <CardDescription className="mt-1">
                  {config.description}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{getProgress()}%</span>
              </div>
              <Progress value={getProgress()} className="h-2" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">Created</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(jobStatus.created_at).toLocaleString()}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-medium">Duration</p>
                <p className="text-sm text-muted-foreground">
                  {formatDuration(
                    jobStatus.created_at,
                    jobStatus.status === "COMPLETED"
                      ? jobStatus.updated_at
                      : undefined
                  )}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-medium">Type</p>
                <p className="text-sm text-muted-foreground">
                  {jobStatus.type
                    .replace("_", " ")
                    .toLowerCase()
                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Card */}
        {jobStatus.status === "FAILED" && jobStatus.error && (
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-700 flex items-center space-x-2">
                <XCircle className="h-5 w-5" />
                <span>Error Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-red-800 font-mono text-sm">
                  {jobStatus.error}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results Card */}
        {jobStatus.status === "COMPLETED" && jobStatus.result && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Scan Results</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center space-x-3">
                  <div className="p-3 rounded-full bg-blue-50">
                    <FileSearch className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
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
                    <p className="text-2xl font-bold">
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
                    <p className="text-2xl font-bold">
                      {Math.round((jobStatus.result.scan_duration || 0) / 1000)}
                      s
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Scan Duration
                    </p>
                  </div>
                </div>
              </div>

              {jobStatus.result.vulnerabilities &&
                jobStatus.result.vulnerabilities.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-semibold mb-3">
                      Recent Vulnerabilities
                    </h4>
                    <div className="space-y-2">
                      {jobStatus.result.vulnerabilities
                        .slice(0, 5)
                        .map((vuln, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                          >
                            <div className="flex-1">
                              <p className="font-medium text-sm">
                                {vuln.title}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {vuln.file_path}
                              </p>
                            </div>
                            <Badge className={getSeverityColor(vuln.severity)}>
                              {vuln.severity}
                            </Badge>
                          </div>
                        ))}
                    </div>

                    {jobStatus.result.vulnerabilities.length > 5 && (
                      <div className="mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            router.push(`/vulnerabilities/${jobStatus.job_id}`)
                          }
                        >
                          View All {jobStatus.result.vulnerabilities.length}{" "}
                          Vulnerabilities
                        </Button>
                      </div>
                    )}
                  </div>
                )}
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        {jobStatus.status === "COMPLETED" && (
          <div className="flex space-x-4">
            <Button
              onClick={() =>
                router.push(`/vulnerabilities/${jobStatus.job_id}`)
              }
              className="flex items-center space-x-2"
            >
              <Bug className="h-4 w-4" />
              <span>View Vulnerabilities</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/scan-targets")}
            >
              Back to Scan Projects
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
