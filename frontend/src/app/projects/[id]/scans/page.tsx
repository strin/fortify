"use client";

import { useEffect, useState } from "react";
import { useProject } from "../layout";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar,
  Clock,
  FileText,
  GitBranch,
  Shield,
  Target,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";

interface ScanTarget {
  id: string;
  name: string;
  repoUrl: string;
  branch: string;
  subPath: string;
}

interface ProcessedScan {
  id: string;
  type: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  vulnerabilitiesFound: number;
  error: string | null;
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

interface ScansResponse {
  scans: ProcessedScan[];
  totalScans: number;
  error?: string;
}

export default function ProjectScansPage() {
  const { project, showCreateScanDialog } = useProject();
  const [scans, setScans] = useState<ProcessedScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (project?.id) {
      fetchScans();
    }
  }, [project?.id]);

  const fetchScans = async () => {
    if (!project?.id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/projects/${project.id}/scans`);
      const data: ScansResponse = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch scans");
      }
      
      setScans(data.scans);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch scans");
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

  const formatDuration = (startedAt: string | null, finishedAt: string | null) => {
    if (!startedAt || !finishedAt) return null;
    
    const start = new Date(startedAt);
    const finish = new Date(finishedAt);
    const diffMs = finish.getTime() - start.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffSeconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    
    if (diffMinutes > 0) {
      return `${diffMinutes}m ${diffSeconds}s`;
    }
    return `${diffSeconds}s`;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return "bg-destructive text-destructive-foreground";
      case "high":
        return "bg-orange-600 text-white";
      case "medium":
        return "bg-chart-4 text-white";
      case "low":
        return "bg-chart-2 text-white";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <CheckCircle className="h-4 w-4" />;
      case "FAILED":
        return <XCircle className="h-4 w-4" />;
      case "IN_PROGRESS":
        return <Loader2 className="h-4 w-4 animate-spin" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "default";
      case "FAILED":
        return "destructive";
      case "IN_PROGRESS":
        return "secondary";
      default:
        return "outline";
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-5 w-80" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                All Scans
              </CardTitle>
              <CardDescription>
                Comprehensive list of all security scans for this project
              </CardDescription>
            </div>
            <Button 
              onClick={showCreateScanDialog}
              disabled={!project || project.repositories.length === 0}
            >
              <Target className="h-4 w-4 mr-2" />
              Create New Scan
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-6 p-4 border border-destructive/20 bg-destructive/10 rounded-lg">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <span>Error: {error}</span>
              </div>
            </div>
          )}
          
          {scans.length > 0 ? (
            <div className="space-y-4">
              {scans.map((scan) => (
                <Card key={scan.id} className="bg-card/50">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          {getStatusIcon(scan.status)}
                          <div>
                            <h3 className="font-medium">
                              {scan.scanTarget?.name || 
                               (scan.data?.repo_url ? new URL(scan.data.repo_url).pathname.substring(1) : 'Repository Scan')
                              }
                            </h3>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(scan.createdAt)}
                              </span>
                              {scan.scanTarget && (
                                <>
                                  <span className="flex items-center gap-1">
                                    <GitBranch className="h-3 w-3" />
                                    {scan.scanTarget.branch}
                                  </span>
                                  {scan.scanTarget.subPath !== "/" && (
                                    <span className="text-xs bg-muted px-2 py-1 rounded">
                                      {scan.scanTarget.subPath}
                                    </span>
                                  )}
                                </>
                              )}
                              {scan.finishedAt && scan.startedAt && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDuration(scan.startedAt, scan.finishedAt)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <Badge variant={getStatusVariant(scan.status)}>
                            {scan.status.toLowerCase()}
                          </Badge>
                          
                          {scan.status === "COMPLETED" && (
                            <>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Shield className="h-3 w-3" />
                                <span>{scan.totalVulnerabilities} vulnerabilities</span>
                              </div>
                              
                              {scan.totalVulnerabilities > 0 && (
                                <div className="flex gap-1">
                                  {["CRITICAL", "HIGH", "MEDIUM", "LOW"].map((severity) => {
                                    const count = scan.vulnerabilityCounts[severity as keyof typeof scan.vulnerabilityCounts];
                                    if (count === 0) return null;
                                    return (
                                      <Badge 
                                        key={severity} 
                                        className={`text-xs px-2 py-1 ${getSeverityColor(severity)}`}
                                      >
                                        {count} {severity.toLowerCase()}
                                      </Badge>
                                    );
                                  })}
                                </div>
                              )}
                            </>
                          )}
                          
                          {scan.status === "FAILED" && scan.error && (
                            <span className="text-sm text-destructive">
                              {scan.error}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/jobs/${scan.id}`}>
                            View Details
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              <div className="text-center py-4 text-sm text-muted-foreground">
                Showing all {scans.length} scan{scans.length === 1 ? '' : 's'}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No scans yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first scan to see security analysis results
              </p>
              <Button 
                onClick={showCreateScanDialog}
                disabled={!project || project.repositories.length === 0}
              >
                <Target className="h-4 w-4 mr-2" />
                Create Your First Scan
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}