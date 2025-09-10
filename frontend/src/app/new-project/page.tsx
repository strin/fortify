"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  GitBranch,
  Github,
  Loader2,
  Search,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Repository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  owner: {
    login: string;
    avatar_url: string;
  };
  default_branch: string;
  updated_at: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  html_url: string;
  clone_url: string;
}

interface Branch {
  name: string;
  commit: {
    sha: string;
  };
}

function NewProjectForm() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Authentication state
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Form state
  const [step, setStep] = useState(1); // 1: Repository Selection, 2: Configuration, 3: Review
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form data
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Check authentication and handle redirect
  useEffect(() => {
    if (status === "loading") {
      return; // Still loading session
    }

    if (status === "unauthenticated") {
      // Store the current URL to redirect back after login
      const currentUrl = window.location.pathname + window.location.search;
      router.push(`/login?callbackUrl=${encodeURIComponent(currentUrl)}`);
      return;
    }

    // User is authenticated, fetch repositories
    if (session && step === 1) {
      fetchRepositories();
    }
  }, [status, session, step, router]);

  // Fetch user's repositories
  const fetchRepositories = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/github/repos");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch repositories");
      }

      setRepositories(data.repositories);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch repositories"
      );
    } finally {
      setLoading(false);
    }
  };

  // Fetch branches for selected repository
  const fetchBranches = async (owner: string, repo: string) => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/repositories/branches/${owner}/${repo}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch branches");
      }

      setBranches(data.branches);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch branches");
    } finally {
      setLoading(false);
    }
  };

  // Handle repository selection
  const handleRepositorySelect = async (repo: Repository) => {
    setSelectedRepo(repo);
    setProjectName(repo.name); // Default project name to repository name
    setSelectedBranch(repo.default_branch);

    if (repo.owner && repo.owner.login) {
      await fetchBranches(repo.owner.login, repo.name);
    }

    setStep(2);
  };

  // Handle project creation
  const handleCreateProject = async () => {
    // More detailed validation with specific error messages
    if (!selectedRepo) {
      setError("Please select a repository");
      return;
    }

    if (!projectName.trim()) {
      setError("Please enter a project name");
      return;
    }

    if (!selectedBranch) {
      setError("Please select a branch");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const projectData = {
        name: projectName,
        description: description || null,
        repository: {
          fullName: selectedRepo.full_name,
          description: selectedRepo.description,
          repoUrl: selectedRepo.clone_url,
          defaultBranch: selectedBranch,
          isPrivate: selectedRepo.private,
          externalId: selectedRepo.id.toString(),
          provider: "GITHUB",
        },
      };

      console.log("Creating project with data:", projectData);

      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(projectData),
      });

      const data = await response.json();
      console.log("Project creation response:", {
        status: response.status,
        data,
      });

      if (!response.ok) {
        throw new Error(
          data.error || `Failed to create project (${response.status})`
        );
      }

      // Redirect to project detail page
      router.push(`/projects/${data.id}`);
    } catch (err) {
      console.error("Project creation error:", err);
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setLoading(false);
    }
  };

  // Filter repositories based on search
  const filteredRepositories = repositories.filter(
    (repo) =>
      repo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      repo.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ""
  );

  // Show loading state while checking authentication
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Skeleton className="h-9 w-32" />
              <Skeleton className="h-9 w-64" />
            </div>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center gap-2">
                <Skeleton className="w-8 h-8 rounded-full" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-4 w-4" />
              <div className="flex items-center gap-2">
                <Skeleton className="w-8 h-8 rounded-full" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </div>

          <Card className="bg-card border-border">
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-80" />
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <Skeleton className="h-10 w-full" />
                <div className="space-y-3 max-h-96">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="p-4 rounded-lg border border-border">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Skeleton className="h-5 w-48" />
                            <Skeleton className="h-5 w-16" />
                            <Skeleton className="h-5 w-20" />
                          </div>
                          <Skeleton className="h-4 w-full mb-2" />
                          <div className="flex items-center gap-4">
                            <Skeleton className="h-3 w-12" />
                            <Skeleton className="h-3 w-12" />
                            <Skeleton className="h-3 w-16" />
                          </div>
                        </div>
                        <Skeleton className="h-8 w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Don't render anything if redirecting to login
  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <h1 className="text-3xl font-bold">Create New Project</h1>
          </div>

          {/* Progress indicator */}
          <div className="flex items-center gap-4 mb-6">
            <div
              className={`flex items-center gap-2 ${
                step >= 1 ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= 1 ? "bg-primary" : "bg-muted"
                }`}
              >
                {step > 1 ? <Check className="h-4 w-4" /> : "1"}
              </div>
              <span>Select Repository</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div
              className={`flex items-center gap-2 ${
                step >= 2 ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= 2 ? "bg-primary" : "bg-muted"
                }`}
              >
                {step > 2 ? <Check className="h-4 w-4" /> : "2"}
              </div>
              <span>Configure Project</span>
            </div>
          </div>
        </div>

        {error && (
          <Alert className="mb-6 border-destructive bg-destructive/10">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Step 1: Repository Selection */}
        {step === 1 && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Github className="h-5 w-5" />
                Select Repository
              </CardTitle>
              <CardDescription>
                Choose a GitHub repository to create a project for
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search repositories..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-secondary border-border"
                  />
                </div>

                {/* Repository List */}
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {loading ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="p-4 rounded-lg border border-border">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Skeleton className="h-5 w-48" />
                                <Skeleton className="h-5 w-16" />
                                <Skeleton className="h-5 w-20" />
                              </div>
                              <Skeleton className="h-4 w-full mb-2" />
                              <div className="flex items-center gap-4">
                                <Skeleton className="h-3 w-12" />
                                <Skeleton className="h-3 w-12" />
                                <Skeleton className="h-3 w-16" />
                              </div>
                            </div>
                            <Skeleton className="h-8 w-16" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : filteredRepositories.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No repositories found</p>
                    </div>
                  ) : (
                    filteredRepositories.map((repo) => (
                      <div
                        key={repo.id}
                        className="p-4 rounded-lg border border-border hover:border-muted cursor-pointer transition-colors"
                        onClick={() => handleRepositorySelect(repo)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-medium">{repo.full_name}</h3>
                              {repo.private && (
                                <Badge variant="secondary" className="text-xs">
                                  Private
                                </Badge>
                              )}
                              {repo.language && (
                                <Badge variant="outline" className="text-xs">
                                  {repo.language}
                                </Badge>
                              )}
                            </div>
                            {repo.description && (
                              <p className="text-muted-foreground text-sm mb-2">
                                {repo.description}
                              </p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>★ {repo.stargazers_count}</span>
                              <span>⚡ {repo.forks_count}</span>
                              <span className="flex items-center gap-1">
                                <GitBranch className="h-3 w-3" />
                                {repo.default_branch}
                              </span>
                            </div>
                          </div>
                          <Button size="sm">Select</Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Configuration */}
        {step === 2 && selectedRepo && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Configure Project</CardTitle>
              <CardDescription>
                Set up your project details and scanning configuration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Selected Repository Info */}
                <div className="p-4 rounded-lg bg-gray-700 border border-gray-600">
                  <h4 className="font-medium mb-2">Selected Repository</h4>
                  <div className="flex items-center gap-2">
                    <Github className="h-4 w-4" />
                    <span>{selectedRepo.full_name}</span>
                    {selectedRepo.private && (
                      <Badge variant="secondary" className="text-xs">
                        Private
                      </Badge>
                    )}
                  </div>
                  {selectedRepo.description && (
                    <p className="text-muted-foreground text-sm mt-2">
                      {selectedRepo.description}
                    </p>
                  )}
                </div>

                <Separator className="bg-muted" />

                {/* Project Configuration */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="projectName">Project Name *</Label>
                      <Input
                        id="projectName"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        placeholder="Enter project name"
                        className="bg-secondary border-border"
                      />
                    </div>

                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Optional project description"
                        className="bg-secondary border-border"
                        rows={3}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="branch">Default Branch</Label>
                      <select
                        id="branch"
                        value={selectedBranch}
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        className="w-full p-2 rounded-md bg-gray-700 border border-gray-600 text-white"
                      >
                        {branches.map((branch) => (
                          <option key={branch.name} value={branch.name}>
                            {branch.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                disabled={loading}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleCreateProject}
                disabled={loading || !projectName.trim()}
              >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Project
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function NewProjectPage() {
  return <NewProjectForm />;
}
