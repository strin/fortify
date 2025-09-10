"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
import { 
  RepositoryConflictDialog, 
  type ProjectConflict 
} from "./repository-conflict-dialog";

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

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateProjectDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateProjectDialogProps) {
  const [step, setStep] = useState<"select" | "configure">("select");
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    defaultBranch: "",
  });

  // Conflict handling
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [projectConflict, setProjectConflict] = useState<ProjectConflict | null>(null);

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
      setError(
        err instanceof Error ? err.message : "Failed to fetch branches"
      );
    } finally {
      setLoading(false);
    }
  };

  // Check for repository conflict
  const checkRepositoryConflict = async (repo: Repository) => {
    try {
      const response = await fetch("/api/repositories/check-conflict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: repo.full_name,
          provider: "GITHUB",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to check repository conflict");
      }

      return data;
    } catch (err) {
      console.error("Error checking repository conflict:", err);
      setError(err instanceof Error ? err.message : "Failed to check repository");
      return null;
    }
  };

  // Handle repository selection
  const handleSelectRepository = async (repo: Repository) => {
    // Defensive check to ensure owner data exists
    if (!repo.owner || !repo.owner.login) {
      setError("Repository owner information is missing. Please try refreshing the repository list.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Check for conflicts first
      const conflictCheck = await checkRepositoryConflict(repo);
      
      if (!conflictCheck) {
        return; // Error already set by checkRepositoryConflict
      }

      if (conflictCheck.hasConflict) {
        // Show conflict dialog
        setProjectConflict(conflictCheck.conflict);
        setShowConflictDialog(true);
        return;
      }

      // No conflict, proceed with selection
      setSelectedRepo(repo);
      setFormData((prev) => ({
        ...prev,
        name: repo.name,
        description: repo.description || "",
        defaultBranch: repo.default_branch,
      }));

      await fetchBranches(repo.owner.login, repo.name);
      setStep("configure");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to select repository");
    } finally {
      setLoading(false);
    }
  };

  // Create project
  const handleCreateProject = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!selectedRepo) {
        throw new Error("No repository selected");
      }

      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          repository: {
            fullName: selectedRepo.full_name,
            description: selectedRepo.description,
            repoUrl: selectedRepo.clone_url,
            defaultBranch: formData.defaultBranch,
            isPrivate: selectedRepo.private,
            externalId: selectedRepo.id.toString(),
            provider: "GITHUB",
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create project");
      }

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create project"
      );
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep("select");
    setSelectedRepo(null);
    setBranches([]);
    setFormData({
      name: "",
      description: "",
      defaultBranch: "",
    });
    setSearchTerm("");
    setError(null);
  };

  // Load repositories when dialog opens
  useEffect(() => {
    if (open && step === "select") {
      fetchRepositories();
    }
  }, [open, step]);

  // Filter repositories based on search
  const filteredRepositories = repositories.filter(
    (repo) =>
      repo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      repo.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ""
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-popover border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            Create New Project
          </DialogTitle>
          <DialogDescription>
            {step === "select"
              ? "Choose a GitHub repository to create a project for"
              : "Configure your project settings"}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert className="border-destructive bg-destructive/10">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex-1 overflow-hidden flex flex-col">
          {step === "select" && (
            <div className="space-y-4 flex flex-col h-full">
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
              <div className="flex-1 overflow-y-auto space-y-3">
                {loading ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    <p className="text-muted-foreground">Loading repositories...</p>
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
                      onClick={() => handleSelectRepository(repo)}
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
                        <Button size="sm">
                          Select
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {step === "configure" && selectedRepo && (
            <div className="space-y-6">
              {/* Selected Repository Info */}
              <div className="p-4 rounded-lg bg-secondary border border-gray-600">
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

              <Separator className="bg-gray-600" />

              {/* Project Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="projectName">Project Name *</Label>
                    <Input
                      id="projectName"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, name: e.target.value }))
                      }
                      placeholder="Enter project name"
                      className="bg-secondary border-border"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, description: e.target.value }))
                      }
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
                      value={formData.defaultBranch}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, defaultBranch: e.target.value }))
                      }
                      className="w-full p-2 rounded-md bg-secondary border border-gray-600 text-white"
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
          )}
        </div>

        <DialogFooter className="flex justify-between">
          {step === "configure" && (
            <Button
              variant="outline"
              onClick={() => setStep("select")}
              disabled={loading}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {step === "configure" && (
              <Button
                onClick={handleCreateProject}
                disabled={loading || !formData.name.trim()}
              >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Project
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
      
      {/* Repository Conflict Dialog */}
      <RepositoryConflictDialog
        open={showConflictDialog}
        onOpenChange={setShowConflictDialog}
        conflict={projectConflict}
        onGoToProject={() => {
          if (projectConflict?.existingProject.id) {
            onOpenChange(false); // Close the main dialog first
            // Navigation will be handled by the conflict dialog
          }
        }}
        showCreateNewOption={false}
      />
    </Dialog>
  );
}