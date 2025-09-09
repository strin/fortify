"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  GitBranch,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Github,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Repository {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  language: string | null;
  defaultBranch: string;
  private: boolean;
  cloneUrl: string;
  htmlUrl: string;
  stars?: number;
  forks?: number;
  updatedAt?: string;
  size?: number;
  visibility?: string;
  topics?: string[];
  owner: {
    login: string;
    avatarUrl: string;
  };
}

interface Branch {
  name: string;
  protected: boolean;
  commit: {
    sha: string;
    url: string;
  };
}

interface CreateScanTargetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateScanTargetDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateScanTargetDialogProps) {
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
    repoUrl: "",
    branch: "",
    subPath: "",
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
      setError(err instanceof Error ? err.message : "Failed to fetch branches");
    } finally {
      setLoading(false);
    }
  };

  // Handle repository selection
  const handleSelectRepository = async (repo: Repository) => {
    // Defensive check to ensure owner data exists
    if (!repo.owner || !repo.owner.login) {
      setError("Repository owner information is missing. Please try refreshing the repository list.");
      return;
    }

    setSelectedRepo(repo);
    setFormData((prev) => ({
      ...prev,
      name: repo.name,
      description: repo.description || "",
      repoUrl: repo.cloneUrl,
      branch: repo.defaultBranch,
    }));

    await fetchBranches(repo.owner.login, repo.name);
    setStep("configure");
  };

  // Create scan target
  const handleCreateScanTarget = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/scan-targets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create scan target");
      }

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create scan target"
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
      repoUrl: "",
      branch: "",
      subPath: "",
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
      repo.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (repo.description &&
        repo.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === "select" ? "Select Repository" : "Configure Scan Target"}
          </DialogTitle>
          <DialogDescription>
            {step === "select"
              ? "Choose a repository to create a new scan target"
              : "Configure your scan target settings"}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-destructive text-sm">{error}</span>
          </div>
        )}

        {step === "select" && (
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Input
                placeholder="Search repositories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Repository List */}
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">
                  Loading repositories...
                </span>
              </div>
            ) : (
              <div className="grid gap-3 max-h-96 overflow-y-auto">
                {filteredRepositories.map((repo) => (
                  <Card
                    key={repo.id}
                    className="hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => handleSelectRepository(repo)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Github className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <CardTitle className="text-base">
                              {repo.name}
                            </CardTitle>
                            <CardDescription className="text-sm">
                              {repo.fullName}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {repo.private && (
                            <Badge variant="outline">Private</Badge>
                          )}
                          {repo.language && (
                            <Badge variant="secondary">{repo.language}</Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    {repo.description && (
                      <CardContent className="pt-0">
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {repo.description}
                        </p>
                      </CardContent>
                    )}
                  </Card>
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
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Github className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <CardTitle className="text-base">
                        {selectedRepo.name}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {selectedRepo.fullName}
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setStep("select")}
                  >
                    Change Repository
                  </Button>
                </div>
              </CardHeader>
            </Card>

            {/* Configuration Form */}
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">
                  Scan Target Name
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Enter a descriptive name"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">
                  Description (Optional)
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Describe what this scan target covers"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="branch">
                    Branch
                  </Label>
                  <Select
                    value={formData.branch}
                    onValueChange={(value: string) =>
                      setFormData((prev) => ({ ...prev, branch: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((branch) => (
                        <SelectItem key={branch.name} value={branch.name}>
                          <div className="flex items-center gap-2">
                            <GitBranch className="h-3 w-3" />
                            {branch.name}
                            {branch.protected && (
                              <Badge variant="outline" className="text-xs">
                                Protected
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="subPath">
                    Sub-path (Optional)
                  </Label>
                  <Input
                    id="subPath"
                    value={formData.subPath}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        subPath: e.target.value,
                      }))
                    }
                    placeholder="e.g., /src/app"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {step === "configure" && (
            <Button
              onClick={handleCreateScanTarget}
              disabled={loading || !formData.name || !formData.branch}
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Create Scan Target
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
