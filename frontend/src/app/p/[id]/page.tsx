"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { redirect, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import Link from "next/link";
import {
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  FolderOpen,
  Shield,
  Settings,
  Play,
  FileText,
  BarChart3,
  GitBranch,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  ExternalLink,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface VulnerabilityStats {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  total: number;
}

interface ScanStats {
  total: number;
  completed: number;
  failed: number;
  pending: number;
  inProgress: number;
}

interface Repository {
  id: string;
  fullName: string;
  provider: string;
  scanTargets: Array<{
    id: string;
    name: string;
    branch: string;
    subPath: string | null;
  }>;
}

interface ScanJob {
  id: string;
  status: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  vulnerabilitiesFound: number;
  vulnerabilityCounts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  scanTarget?: {
    name: string;
    repoUrl: string;
    branch: string;
  };
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastScanAt: string | null;
  settings: any;
  vulnerabilityStats: VulnerabilityStats;
  scanStats: ScanStats;
  repositories: Repository[];
  totalRepositories: number;
  scanJobs: ScanJob[];
}

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "overview");
  const [scanFilter, setScanFilter] = useState({
    status: "all",
    branch: "all",
    search: "",
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/login");
    }
  }, [status]);

  const fetchProject = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/projects/${id}`, {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          router.push("/projects");
          return;
        }
        throw new Error(data.error || "Failed to fetch project");
      }

      setProject(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    if (session) {
      fetchProject();
    }
  }, [session, id, fetchProject]);

  // Lightweight polling while any job is active
  useEffect(() => {
    if (!project) return;

    const hasActive = project.scanJobs?.some(
      (s) => s.status === "PENDING" || s.status === "IN_PROGRESS"
    );

    if (!hasActive) return;

    const interval = setInterval(() => {
      fetchProject();
    }, 3000);

    return () => clearInterval(interval);
  }, [project, fetchProject]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const formatDateShort = (dateString: string | null) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year:
        date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    });
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
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case "FAILED":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      case "IN_PROGRESS":
        return (
          <Badge variant="secondary">
            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            Running
          </Badge>
        );
      case "PENDING":
        return (
          <Badge variant="outline">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getVulnerabilityBadges = (counts: VulnerabilityStats | any) => {
    const badges: React.JSX.Element[] = [];
    if (counts.critical > 0)
      badges.push(
        <Badge key="critical" variant="destructive">
          {counts.critical} Critical
        </Badge>
      );
    if (counts.high > 0)
      badges.push(
        <Badge key="high" variant="destructive" className="bg-orange-600">
          {counts.high} High
        </Badge>
      );
    if (counts.medium > 0)
      badges.push(
        <Badge key="medium" variant="secondary">
          {counts.medium} Medium
        </Badge>
      );
    if (counts.low > 0)
      badges.push(
        <Badge key="low" variant="outline">
          {counts.low} Low
        </Badge>
      );

    return badges.length > 0 ? badges : null;
  };

  const filteredScans = project?.scanJobs?.filter((scan) => {
    if (scanFilter.status !== "all" && scan.status !== scanFilter.status) return false;
    if (scanFilter.search && !scan.id.toLowerCase().includes(scanFilter.search.toLowerCase())) return false;
    return true;
  }) || [];

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading project...</p>
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
            <h2 className="text-2xl font-bold mb-4">Error Loading Project</h2>
            <p className="text-gray-300 mb-6">{error}</p>
            <div className="flex gap-4 justify-center">
              <Button onClick={fetchProject}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button asChild variant="outline">
                <Link href="/projects">Back to Projects</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="sm">
              <Link href="/projects">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Projects
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <FolderOpen className="h-8 w-8 text-blue-400" />
                {project.name}
                {!project.isActive && <Badge variant="outline">Inactive</Badge>}
              </h1>
              <p className="text-gray-400 mt-1">
                {project.totalRepositories} repository{project.totalRepositories === 1 ? '' : 'ies'} • 
                {project.scanStats.total} scans • Last scan {formatDateShort(project.lastScanAt)}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={fetchProject} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setActiveTab("settings")}>
                  <Settings className="h-4 w-4 mr-2" />
                  Project Settings
                </DropdownMenuItem>
                <DropdownMenuItem className="text-red-400">
                  <XCircle className="h-4 w-4 mr-2" />
                  Delete Project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Tab Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-gray-800 border-gray-700">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="scans" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Scans
            </TabsTrigger>
            <TabsTrigger value="compliance" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Compliance
            </TabsTrigger>
            <TabsTrigger value="policy" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Policy
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {/* Vulnerability Summary Cards */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-400">Critical</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-400">
                    {project.vulnerabilityStats.critical}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-400">High</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-400">
                    {project.vulnerabilityStats.high}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-400">Medium</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-400">
                    {project.vulnerabilityStats.medium}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-400">Low</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-400">
                    {project.vulnerabilityStats.low}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Scan Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-400">Total Scans</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {project.scanStats.total}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-400">Completed</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-400">
                    {project.scanStats.completed}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-400">Failed</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-400">
                    {project.scanStats.failed}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-400">In Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-400">
                    {project.scanStats.inProgress + project.scanStats.pending}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Scans */}
            <Card className="bg-gray-800 border-gray-700 mb-8">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-white">Recent Scans</CardTitle>
                    <CardDescription className="text-gray-400">
                      Latest scan results across all repositories
                    </CardDescription>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/p/${project.id}?tab=scans`}>
                      View All Scans
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {project.scanJobs.length === 0 ? (
                  <div className="text-center py-8">
                    <Shield className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-400">No scans yet for this project</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {project.scanJobs.slice(0, 5).map((scan) => (
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
                              {scan.scanTarget?.name || "Unknown target"} • {formatDateShort(scan.createdAt)}
                              {scan.startedAt && scan.finishedAt && (
                                <span>
                                  {" "}
                                  • Duration: {formatDuration(scan.startedAt, scan.finishedAt)}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          {scan.status === "COMPLETED" && (
                            <div className="flex gap-1">
                              {getVulnerabilityBadges(scan.vulnerabilityCounts) || (
                                <Badge variant="outline" className="text-green-600">
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
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Repositories */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Repositories</CardTitle>
                <CardDescription className="text-gray-400">
                  Repositories included in this project
                </CardDescription>
              </CardHeader>
              <CardContent>
                {project.repositories.length === 0 ? (
                  <div className="text-center py-8">
                    <GitBranch className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-400">No repositories added to this project yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {project.repositories.map((repo) => (
                      <div
                        key={repo.id}
                        className="flex items-center justify-between p-4 bg-gray-750 rounded-lg border border-gray-600"
                      >
                        <div>
                          <p className="text-white font-medium flex items-center gap-2">
                            <GitBranch className="h-4 w-4" />
                            {repo.fullName}
                          </p>
                          <p className="text-sm text-gray-400">
                            {repo.scanTargets.length} scan target{repo.scanTargets.length === 1 ? '' : 's'}
                          </p>
                        </div>
                        <Button variant="outline" size="sm">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View Repository
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Scans Tab */}
          <TabsContent value="scans" className="mt-8">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-white">All Scans</CardTitle>
                    <CardDescription className="text-gray-400">
                      Comprehensive list of all scan runs
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Select value={scanFilter.status} onValueChange={(value) => setScanFilter(prev => ({...prev, status: value}))}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                        <SelectItem value="FAILED">Failed</SelectItem>
                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Search scans..."
                      value={scanFilter.search}
                      onChange={(e) => setScanFilter(prev => ({...prev, search: e.target.value}))}
                      className="w-[200px]"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredScans.length === 0 ? (
                  <div className="text-center py-8">
                    <Shield className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-400">No scans match your filters</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredScans.map((scan) => (
                      <div
                        key={scan.id}
                        className="flex items-center justify-between p-4 bg-gray-750 rounded-lg border border-gray-600"
                      >
                        <div className="flex items-center gap-4">
                          <div>{getStatusBadge(scan.status)}</div>
                          <div>
                            <p className="text-white font-medium">
                              {scan.id}
                            </p>
                            <p className="text-sm text-gray-400">
                              {scan.scanTarget?.repoUrl && (
                                <>
                                  {scan.scanTarget.repoUrl.split('/').slice(-2).join('/')} • {scan.scanTarget.branch}
                                  <br />
                                </>
                              )}
                              {formatDate(scan.createdAt)}
                              {scan.startedAt && scan.finishedAt && (
                                <span>
                                  {" "}
                                  • Duration: {formatDuration(scan.startedAt, scan.finishedAt)}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          {scan.status === "COMPLETED" && (
                            <div className="flex gap-1">
                              {getVulnerabilityBadges(scan.vulnerabilityCounts) || (
                                <Badge variant="outline" className="text-green-600">
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
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Compliance Tab */}
          <TabsContent value="compliance" className="mt-8">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Compliance Reporting</CardTitle>
                <CardDescription className="text-gray-400">
                  Generate compliance evidence and reports
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-16">
                  <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-xl font-semibold mb-2 text-white">
                    Compliance Reporting is Coming Soon
                  </h3>
                  <p className="text-gray-400 max-w-2xl mx-auto">
                    You'll be able to generate evidence for SOC2, ISO, and HIPAA directly 
                    from your scan history. Map findings to compliance frameworks and 
                    export reports in PDF, CSV, and JSON formats.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Policy Tab */}
          <TabsContent value="policy" className="mt-8">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Policy Management</CardTitle>
                <CardDescription className="text-gray-400">
                  Configure automated monitors and enforcement rules
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-16">
                  <Settings className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-xl font-semibold mb-2 text-white">
                    Policy Management is Coming Soon
                  </h3>
                  <p className="text-gray-400 max-w-2xl mx-auto">
                    You'll be able to define automated monitors and enforcement rules. 
                    Configure scan triggers, set severity thresholds for blocking merges, 
                    and manage waiver/ignore lists.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="mt-8">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Project Settings</CardTitle>
                <CardDescription className="text-gray-400">
                  Configure integrations and notifications for this project
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="project-name" className="text-white">Project Name</Label>
                    <Input
                      id="project-name"
                      defaultValue={project.name}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="project-description" className="text-white">Description</Label>
                    <Textarea
                      id="project-description"
                      defaultValue={project.description || ""}
                      className="mt-1"
                      placeholder="Describe what this project is about..."
                    />
                  </div>
                </div>

                <div className="border-t border-gray-700 pt-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Scan Settings</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-white">Auto-trigger scans on PRs</Label>
                        <p className="text-sm text-gray-400">
                          Automatically run security scans when pull requests are created
                        </p>
                      </div>
                      <Switch />
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-700 pt-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Notifications</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-white">Slack Integration</Label>
                        <p className="text-sm text-gray-400">
                          Send scan results and alerts to Slack channel
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        Configure
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-700 pt-6">
                  <Button className="mr-4">Save Changes</Button>
                  <Button variant="outline">Cancel</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}