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
import { Input } from "@/components/ui/input";
import Link from "next/link";
import {
  Search,
  Plus,
  RefreshCw,
  AlertCircle,
  FolderOpen,
  Calendar,
  MoreHorizontal,
  ExternalLink,
  Settings,
  Star,
  Shield,
  GitBranch,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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
}

interface RecentScan {
  id: string;
  status: string;
  createdAt: string;
  vulnerabilitiesFound: number;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastScanAt: string | null;
  vulnerabilityStats: VulnerabilityStats;
  scanStats: ScanStats;
  repositories: Repository[];
  totalRepositories: number;
  recentScans: RecentScan[];
}

export default function ProjectsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/login");
    }
  }, [status]);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);

      const response = await fetch(`/api/projects?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch projects");
      }

      setProjects(data.projects);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    if (session) {
      fetchProjects();
    }
  }, [session, searchTerm, fetchProjects]);

  const handleCreateProject = async () => {
    if (!createForm.name.trim()) {
      setError("Project name is required");
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create project");
      }

      setShowCreateDialog(false);
      setCreateForm({ name: "", description: "" });
      await fetchProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year:
        date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    });
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

  const getVulnerabilityBadges = (stats: VulnerabilityStats) => {
    const badges: React.JSX.Element[] = [];
    if (stats.critical > 0)
      badges.push(
        <Badge key="critical" variant="destructive">
          {stats.critical} Critical
        </Badge>
      );
    if (stats.high > 0)
      badges.push(
        <Badge key="high" variant="destructive" className="bg-orange-600">
          {stats.high} High
        </Badge>
      );
    if (stats.medium > 0)
      badges.push(
        <Badge key="medium" variant="secondary">
          {stats.medium} Medium
        </Badge>
      );
    if (stats.low > 0)
      badges.push(
        <Badge key="low" variant="outline">
          {stats.low} Low
        </Badge>
      );

    return badges.length > 0
      ? badges
      : [
          <Badge key="none" variant="outline" className="text-green-600">
            No vulnerabilities
          </Badge>,
        ];
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading projects...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="container mx-auto px-4 py-16">
          <nav className="flex justify-between items-center mb-16">
            <h1 className="text-2xl font-bold">Fortify - Projects</h1>
            <Button asChild variant="outline">
              <Link href="/">Back to Home</Link>
            </Button>
          </nav>

          <div className="max-w-2xl mx-auto text-center">
            <AlertCircle className="h-16 w-16 mx-auto mb-4 text-destructive" />
            <h2 className="text-2xl font-bold mb-4">Error Loading Projects</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={fetchProjects} className="mr-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Projects</h1>
            <p className="text-muted-foreground">
              Manage your security projects and repositories
            </p>
          </div>
          <div className="flex gap-4">
            <Button onClick={fetchProjects} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/scan-targets">
                <Shield className="h-4 w-4 mr-2" />
                Scan Targets
              </Link>
            </Button>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Project
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Project</DialogTitle>
                  <DialogDescription>
                    Projects help you organize your repositories and track security across your codebase.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Project Name</Label>
                    <Input
                      id="name"
                      value={createForm.name}
                      onChange={(e) =>
                        setCreateForm((prev) => ({ ...prev, name: e.target.value }))
                      }
                      placeholder="My Awesome Project"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      value={createForm.description}
                      onChange={(e) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      placeholder="Describe what this project is about..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCreateProject} disabled={creating}>
                    {creating ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    Create Project
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="hover:bg-accent/50 transition-colors"
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <FolderOpen className="h-4 w-4 text-primary" />
                      <CardTitle className="text-lg truncate">
                        <Link
                          href={`/p/${project.id}`}
                          className="hover:underline"
                        >
                          {project.name}
                        </Link>
                      </CardTitle>
                      {!project.isActive && (
                        <Badge variant="outline" className="text-xs">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-sm mb-2">
                      {project.totalRepositories > 0 
                        ? `${project.totalRepositories} repository${project.totalRepositories === 1 ? '' : 'ies'}`
                        : "No repositories"
                      }
                    </CardDescription>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        {project.scanStats.total} scans
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(project.lastScanAt)}
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/p/${project.id}`}>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View Project
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/p/${project.id}?tab=settings`}>
                          <Settings className="h-4 w-4 mr-2" />
                          Settings
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Star className="h-4 w-4 mr-2" />
                        Add to Favorites
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="space-y-4">
                  {/* Description */}
                  {project.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {project.description}
                    </p>
                  )}

                  {/* Repositories */}
                  {project.repositories.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Repositories:</span>
                      <div className="flex flex-wrap gap-1">
                        {project.repositories.slice(0, 3).map((repo) => (
                          <Badge key={repo.id} variant="outline" className="text-xs">
                            <GitBranch className="h-3 w-3 mr-1" />
                            {repo.fullName}
                          </Badge>
                        ))}
                        {project.repositories.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{project.repositories.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Recent Scan Status */}
                  {project.recentScans.length > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Last scan:
                      </span>
                      {getStatusBadge(project.recentScans[0].status)}
                    </div>
                  )}

                  {/* Vulnerability Stats */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1">
                      {getVulnerabilityBadges(project.vulnerabilityStats)}
                    </div>
                  </div>

                  {/* Scan Stats Summary */}
                  <div className="text-xs text-muted-foreground pt-2 border-t border-border">
                    <div className="flex justify-between">
                      <span>
                        {project.scanStats.completed} completed • {project.scanStats.failed} failed
                        {project.scanStats.inProgress > 0 && (
                          <> • {project.scanStats.inProgress} running</>
                        )}
                      </span>
                      <span>Created {formatDate(project.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {projects.length === 0 && !loading && (
          <div className="text-center py-16">
            <FolderOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No Projects Yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Get started by creating your first project. Projects help you organize
              your repositories and track security across your codebase.
            </p>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Project
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Project</DialogTitle>
                  <DialogDescription>
                    Projects help you organize your repositories and track security across your codebase.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Project Name</Label>
                    <Input
                      id="name"
                      value={createForm.name}
                      onChange={(e) =>
                        setCreateForm((prev) => ({ ...prev, name: e.target.value }))
                      }
                      placeholder="My Awesome Project"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      value={createForm.description}
                      onChange={(e) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      placeholder="Describe what this project is about..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCreateProject} disabled={creating}>
                    {creating ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    Create Project
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    </div>
  );
}