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
import { Badge } from "@/components/ui/badge";
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

interface AddRepositoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  projectId: string;
}

export function AddRepositoryDialog({
  open,
  onOpenChange,
  onSuccess,
  projectId,
}: AddRepositoryDialogProps) {
  const [step, setStep] = useState<"select" | "configure">("select");
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    defaultBranch: "",
  });

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

  // Handle repository selection
  const handleSelectRepository = async (repo: Repository) => {
    try {
      setSelectedRepo(repo);
      
      // Set default branch
      setFormData({
        defaultBranch: repo.default_branch,
      });

      // Fetch branches for the repository
      await fetchBranches(repo.owner.login, repo.name);
      
      setStep("configure");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to select repository"
      );
    }
  };

  // Add repository to project
  const handleAddRepository = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!selectedRepo) {
        throw new Error("No repository selected");
      }

      const response = await fetch("/api/repositories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId,
          fullName: selectedRepo.full_name,
          description: selectedRepo.description,
          repoUrl: selectedRepo.clone_url,
          defaultBranch: formData.defaultBranch,
          isPrivate: selectedRepo.private,
          externalId: selectedRepo.id.toString(),
          provider: "GITHUB",
          providerMetadata: {
            owner: selectedRepo.owner,
            language: selectedRepo.language,
            stargazers_count: selectedRepo.stargazers_count,
            forks_count: selectedRepo.forks_count,
            html_url: selectedRepo.html_url,
            updated_at: selectedRepo.updated_at,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          throw new Error("This repository is already added to this project");
        }
        throw new Error(data.error || "Failed to add repository");
      }

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to add repository"
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
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === "select" ? "Select Repository" : "Configure Repository"}
          </DialogTitle>
          <DialogDescription>
            {step === "select"
              ? "Choose a repository to add to this project"
              : "Configure repository settings"}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {step === "select" && (
          <div className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search repositories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Repository List */}
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Loading repositories...
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-2">
                {filteredRepositories.map((repo) => (
                  <div
                    key={repo.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent cursor-pointer"
                    onClick={() => handleSelectRepository(repo)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Github className="h-4 w-4" />
                        <span className="font-medium">{repo.full_name}</span>
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
                        <p className="text-sm text-muted-foreground mb-2">
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
                ))}
              </div>
            )}

            {!loading && filteredRepositories.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  {repositories.length === 0
                    ? "No repositories found. Make sure you have repositories in your GitHub account."
                    : "No repositories match your search."}
                </p>
              </div>
            )}
          </div>
        )}

        {step === "configure" && selectedRepo && (
          <div className="space-y-6">
            {/* Selected Repository Info */}
            <div className="p-4 rounded-lg bg-secondary border border-border">
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

            {/* Branch Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Default Branch</label>
              <select
                value={formData.defaultBranch}
                onChange={(e) =>
                  setFormData({ ...formData, defaultBranch: e.target.value })
                }
                className="w-full p-2 border border-border rounded-md bg-background"
              >
                {branches.map((branch) => (
                  <option key={branch.name} value={branch.name}>
                    {branch.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                This will be used as the default branch for scans
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === "configure" && (
            <Button variant="outline" onClick={() => setStep("select")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          
          {step === "select" && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          )}

          {step === "configure" && (
            <Button
              onClick={handleAddRepository}
              disabled={loading || !formData.defaultBranch}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Add Repository
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}