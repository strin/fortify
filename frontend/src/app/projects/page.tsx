"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  Calendar,
  FileText,
  Filter,
  FolderOpen,
  GitBranch,
  Github,
  Loader2,
  Plus,
  Search,
  Settings,
  Shield,
  Target,
  TrendingUp,
  Activity,
  Clock,
  ExternalLink,
  Users,
  Sparkles
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CreateProjectDialog } from "@/components/project/create-project-dialog";

interface Repository {
  id: string;
  fullName: string;
  description: string | null;
  provider: string;
  defaultBranch: string;
  isPrivate: boolean;
  lastScanAt: string | null;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastScanAt: string | null;
  repositories: Repository[];
  totalScans: number;
  totalRepositories: number;
}

export default function ProjectsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Check authentication
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated") {
      fetchProjects();
    }
  }, [status, router]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/projects");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch projects");
      }

      setProjects(data.projects);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch projects");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSuccess = () => {
    fetchProjects();
  };

  // Filter projects based on search
  const filteredProjects = projects.filter(
    (project) =>
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.repositories.some((repo) =>
        repo.fullName.toLowerCase().includes(searchTerm.toLowerCase())
      )
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
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

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
            <div>
              <Skeleton className="h-9 w-32 mb-2" />
              <Skeleton className="h-5 w-80" />
            </div>
            <div className="mt-4 sm:mt-0 flex gap-3">
              <Skeleton className="h-10 w-32" />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-24" />
          </div>

          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="bg-card border-border">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Skeleton className="h-7 w-48" />
                        <Skeleton className="h-6 w-16" />
                      </div>
                      <Skeleton className="h-4 w-64" />
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-8 w-24" />
                      <Skeleton className="h-8 w-8" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-6">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-4 w-36" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <div>
                      <Skeleton className="h-4 w-24 mb-2" />
                      <div className="flex flex-wrap gap-2">
                        {[...Array(2)].map((_, j) => (
                          <Skeleton key={j} className="h-8 w-40" />
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-3">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              Projects
            </h1>
            <p className="text-muted-foreground text-lg">
              Manage your security scanning projects and connected repositories
            </p>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                {projects.filter(p => p.isActive).length} active projects
              </span>
              <span className="flex items-center gap-2">
                <Github className="h-4 w-4" />
                {projects.reduce((acc, p) => acc + p.totalRepositories, 0)} repositories
              </span>
              <span className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                {projects.reduce((acc, p) => acc + p.totalScans, 0)} total scans
              </span>
            </div>
          </div>
          <div className="mt-6 sm:mt-0 flex gap-3">
            <Button 
              onClick={() => setIsCreateDialogOpen(true)} 
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </div>
        </div>

        {/* Enhanced Search and Filters */}
        <div className="space-y-4 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects, repositories, or descriptions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-card border-border h-11 focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="border-border h-11 px-4">
                <Filter className="h-4 w-4 mr-2" />
                Advanced Filters
              </Button>
              <Button variant="outline" className="border-border h-11 px-4">
                <TrendingUp className="h-4 w-4 mr-2" />
                Sort
              </Button>
            </div>
          </div>
          
          {/* Results Summary */}
          {!loading && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Showing {filteredProjects.length} of {projects.length} projects
                {searchTerm && ` matching "${searchTerm}"`}
              </p>
              {searchTerm && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSearchTerm("")}
                  className="text-sm hover:scale-105 transition-transform"
                >
                  Clear search
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Error State */}
        {error && (
          <Alert className="mb-6 border-destructive bg-destructive/10">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {loading && (
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="bg-card border-border">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Skeleton className="h-7 w-48" />
                        <Skeleton className="h-6 w-16" />
                      </div>
                      <Skeleton className="h-4 w-64" />
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-8 w-24" />
                      <Skeleton className="h-8 w-8" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-6">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-4 w-36" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <div>
                      <Skeleton className="h-4 w-24 mb-2" />
                      <div className="flex flex-wrap gap-2">
                        {[...Array(2)].map((_, j) => (
                          <Skeleton key={j} className="h-8 w-40" />
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Enhanced Empty State */}
        {!loading && filteredProjects.length === 0 && (
          <div className="mt-12">
            {projects.length === 0 ? (
              <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <CardContent className="text-center py-16">
                  <div className="relative">
                    <div className="absolute inset-0 -top-4 -left-4 w-24 h-24 mx-auto bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-xl" />
                    <div className="relative rounded-full bg-gradient-to-r from-blue-600 to-purple-600 p-4 w-16 h-16 mx-auto mb-6">
                      <Shield className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold mb-3">Welcome to Fortify!</h2>
                  <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto">
                    Create your first security project to start scanning repositories for vulnerabilities with AI-powered analysis.
                  </p>
                  <div className="space-y-4">
                    <Button 
                      onClick={() => setIsCreateDialogOpen(true)} 
                      size="lg"
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                    >
                      <Sparkles className="h-5 w-5 mr-2" />
                      Create Your First Project
                    </Button>
                    <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-2">
                        <Github className="h-4 w-4" />
                        Connect GitHub
                      </span>
                      <div className="w-1 h-1 bg-muted-foreground rounded-full" />
                      <span className="flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        AI-powered scanning
                      </span>
                      <div className="w-1 h-1 bg-muted-foreground rounded-full" />
                      <span className="flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Zero false positives
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-card border-border">
                <CardContent className="text-center py-12">
                  <Search className="h-16 w-16 mx-auto mb-6 text-muted-foreground" />
                  <h2 className="text-xl font-semibold mb-2">No matching projects</h2>
                  <p className="text-muted-foreground mb-6">
                    No projects match your search for "{searchTerm}". Try searching for something different.
                  </p>
                  <Button 
                    onClick={() => setSearchTerm("")} 
                    variant="outline"
                    className="hover:scale-105 transition-transform"
                  >
                    Clear Search
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Projects List */}
        {!loading && filteredProjects.length > 0 && (
          <div className="space-y-6">
            {filteredProjects.map((project) => (
              <Link href={`/projects/${project.id}`} key={project.id}>
                <Card className="group bg-card border-border hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 cursor-pointer overflow-hidden hover:scale-[1.005]">
                  {/* Project status indicator */}
                  <div className={`h-1 w-full transition-all duration-300 ${
                    project.isActive 
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 group-hover:h-1.5' 
                      : 'bg-gradient-to-r from-gray-500 to-gray-600 group-hover:h-1.5'
                  }`} />
                  
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`rounded-full p-2 transition-all duration-200 ${
                            project.isActive 
                              ? 'bg-green-500/10 text-green-400 group-hover:bg-green-500/20' 
                              : 'bg-gray-500/10 text-gray-400 group-hover:bg-gray-500/20'
                          }`}>
                            <Shield className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-xl group-hover:text-primary transition-colors flex items-center gap-2">
                              {project.name}
                              <Badge
                                variant={project.isActive ? "default" : "secondary"}
                                className={project.isActive 
                                  ? "bg-green-500/10 text-green-400 border-green-500/20 animate-pulse" 
                                  : "bg-gray-500/10 text-gray-400 border-gray-500/20"
                                }
                              >
                                {project.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </CardTitle>
                            <CardDescription className="mt-2 text-base">
                              {project.description || "No description provided"}
                            </CardDescription>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="hover:scale-105 transition-transform"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                        >
                          <Activity className="h-4 w-4 mr-2" />
                          Scans
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="hover:scale-105 transition-transform"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                <CardContent className="space-y-6">
                  {/* Enhanced Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-secondary/30 p-4 rounded-lg border border-border/50 hover:bg-secondary/50 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <Github className="h-4 w-4 text-blue-400" />
                        <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Repositories</span>
                      </div>
                      <span className="text-2xl font-bold">
                        {project.totalRepositories}
                      </span>
                    </div>
                    
                    <div className="bg-secondary/30 p-4 rounded-lg border border-border/50 hover:bg-secondary/50 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className="h-4 w-4 text-green-400" />
                        <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Total Scans</span>
                      </div>
                      <span className="text-2xl font-bold">
                        {project.totalScans}
                      </span>
                    </div>
                    
                    <div className="bg-secondary/30 p-4 rounded-lg border border-border/50 hover:bg-secondary/50 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4 text-purple-400" />
                        <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Created</span>
                      </div>
                      <span className="text-sm font-medium">
                        {formatDate(project.createdAt)}
                      </span>
                    </div>
                    
                    {project.lastScanAt && (
                      <div className="bg-secondary/30 p-4 rounded-lg border border-border/50 hover:bg-secondary/50 transition-colors">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="h-4 w-4 text-orange-400" />
                          <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Last Scan</span>
                        </div>
                        <span className="text-sm font-medium">
                          {formatTimeAgo(project.lastScanAt)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Enhanced Repositories Section */}
                  {project.repositories.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          <div className="w-1 h-4 bg-primary rounded-full" />
                          Connected Repositories
                        </h4>
                        <Badge variant="outline" className="text-xs">
                          {project.repositories.length} repositories
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {project.repositories.slice(0, 3).map((repo) => (
                          <div
                            key={repo.id}
                            className="group/repo flex items-center justify-between p-3 bg-secondary/20 rounded-lg border border-border/30 hover:bg-secondary/40 hover:border-border/50 transition-all cursor-pointer"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`rounded-full p-1.5 ${
                                repo.isPrivate 
                                  ? 'bg-orange-500/10 text-orange-400'
                                  : 'bg-blue-500/10 text-blue-400'
                              }`}>
                                <Github className="h-3 w-3" />
                              </div>
                              <div>
                                <span className="font-medium text-sm">{repo.fullName}</span>
                                <div className="flex items-center gap-2 mt-1">
                                  {repo.isPrivate && (
                                    <Badge variant="secondary" className="text-xs bg-orange-500/10 text-orange-400 border-orange-500/20">
                                      Private
                                    </Badge>
                                  )}
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <GitBranch className="h-3 w-3" />
                                    {repo.defaultBranch}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover/repo:opacity-100 transition-opacity" />
                          </div>
                        ))}
                        {project.repositories.length > 3 && (
                          <div className="text-center py-2">
                            <Badge variant="outline" className="text-xs">
                              +{project.repositories.length - 3} more repositories
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Create Project Dialog */}
        <CreateProjectDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          onSuccess={handleCreateSuccess}
        />
      </div>
    </div>
  );
}
