"use client";

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
import {
  Calendar,
  Shield,
  Target,
} from "lucide-react";

// Use the Project interface from the layout context

export default function ProjectOverviewPage() {
  const { project, showCreateScanDialog } = useProject();

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
              <div className="text-center py-4">
                <span className="text-sm text-muted-foreground">
                  Vulnerability summary coming soon
                </span>
              </div>
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
                <span className="font-medium">0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Repositories</span>
                <span className="font-medium">
                  {project.repositories.length}
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
          {project.scanJobs && project.scanJobs.length > 0 ? (
            <div className="space-y-4">
              {project.scanJobs.slice(0, 5).map((scan) => (
                <div key={scan.id} className="flex items-center justify-between p-4 border rounded-lg bg-card/50">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">
                          {scan.data?.repo_url ? new URL(scan.data.repo_url).pathname.substring(1) : 'Repository Scan'}
                        </span>
                        <Badge 
                          variant={
                            scan.status === 'COMPLETED' ? 'default' : 
                            scan.status === 'FAILED' ? 'destructive' : 
                            scan.status === 'IN_PROGRESS' ? 'secondary' : 
                            'outline'
                          }
                        >
                          {scan.status.toLowerCase()}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{formatTimeAgo(scan.createdAt)}</span>
                        {scan.status === 'COMPLETED' && (
                          <span className="flex items-center gap-1">
                            <Shield className="h-3 w-3" />
                            {scan.vulnerabilitiesFound} vulnerabilities
                          </span>
                        )}
                      </div>
                    </div>
                    {scan.status === 'COMPLETED' && scan.vulnerabilities && scan.vulnerabilities.length > 0 && (
                      <div className="flex gap-1">
                        {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((severity) => {
                          const count = scan.vulnerabilities.filter(v => v.severity === severity).length;
                          if (count === 0) return null;
                          return (
                            <Badge 
                              key={severity} 
                              className={`text-xs px-1 py-0 ${getSeverityColor(severity)}`}
                            >
                              {count}
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-sm text-muted-foreground">
                  Showing {Math.min(5, project.scanJobs.length)} of {project.totalScans} scans
                </span>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/projects/${project.id}/scans`}>
                    View All Scans
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No scans yet</p>
              <Button 
                className="mt-4"
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