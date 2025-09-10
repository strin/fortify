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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  GitBranch,
  Github,
  Loader2,
  FolderTree,
  Clock,
  AlertCircle,
  Target,
} from "lucide-react";

interface Repository {
  id: string;
  fullName: string;
  description: string | null;
  provider: string;
  defaultBranch: string;
  isPrivate: boolean;
  repoUrl: string;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  repositories: Repository[];
}

interface CreateScanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  onScanCreated: (scanJobId: string) => void;
}

interface ScanConfiguration {
  repositoryId: string;
  branch: string;
  path: string;
}

interface Branch {
  name: string;
  lastCommit?: {
    sha: string;
    message: string;
    date: string;
  };
}

const COMMON_PATHS = [
  { path: "/", label: "Root directory (entire repository)" },
  { path: "/src", label: "Source code" },
  { path: "/lib", label: "Library code" },
  { path: "/api", label: "API endpoints" },
  { path: "/components", label: "Components" },
  { path: "/pages", label: "Pages" },
  { path: "/app", label: "Application code" },
];

export function CreateScanDialog({
  open,
  onOpenChange,
  project,
  onScanCreated,
}: CreateScanDialogProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedRepository, setSelectedRepository] = useState<Repository | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [scanConfig, setScanConfig] = useState<ScanConfiguration>({
    repositoryId: "",
    branch: "",
    path: "/",
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize for single-repository projects
  useEffect(() => {
    if (open && project.repositories.length === 1) {
      const repo = project.repositories[0];
      setSelectedRepository(repo);
      setScanConfig(prev => ({
        ...prev,
        repositoryId: repo.id,
        branch: repo.defaultBranch,
      }));
      setCurrentStep(2); // Skip repository selection
      fetchBranches(repo);
    } else if (open) {
      // Reset state for multi-repo projects
      setCurrentStep(1);
      setSelectedRepository(null);
      setScanConfig({
        repositoryId: "",
        branch: "",
        path: "/",
      });
    }
  }, [open, project.repositories]);

  const fetchBranches = async (repository: Repository) => {
    setLoadingBranches(true);
    setError(null);
    
    try {
      const parts = repository.fullName.split("/");
      const owner = parts[0];
      const repo = parts.slice(1).join("/");
      const response = await fetch(`/api/repositories/branches/${owner}/${repo}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch branches");
      }
      
      const data = await response.json();
      setBranches(data.branches || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch branches");
      // Fallback to default branch if API fails
      setBranches([{ name: repository.defaultBranch }]);
    } finally {
      setLoadingBranches(false);
    }
  };

  const handleRepositorySelect = (repository: Repository) => {
    setSelectedRepository(repository);
    setScanConfig(prev => ({
      ...prev,
      repositoryId: repository.id,
      branch: repository.defaultBranch,
    }));
    fetchBranches(repository);
    setCurrentStep(2);
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCreateScan = async () => {
    if (!selectedRepository) return;

    setCreating(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${project.id}/scans`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          repositoryId: scanConfig.repositoryId,
          branch: scanConfig.branch,
          path: scanConfig.path === "/" ? null : scanConfig.path,
          repoUrl: selectedRepository.repoUrl,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create scan");
      }

      const data = await response.json();
      onScanCreated(data.scanJobId);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create scan");
    } finally {
      setCreating(false);
    }
  };


  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return "Select Repository";
      case 2:
        return "Configure Scan Target";
      case 3:
        return "Review & Confirm";
      default:
        return "";
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 1:
        return "Choose which repository to scan";
      case 2:
        return "Specify branch and path to scan";
      case 3:
        return "Review your scan configuration";
      default:
        return "";
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return selectedRepository !== null;
      case 2:
        return scanConfig.branch && scanConfig.path;
      case 3:
        return true;
      default:
        return false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Create New Scan
          </DialogTitle>
          <DialogDescription>{getStepDescription()}</DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center gap-2 py-4">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step < currentStep
                    ? "bg-green-600 text-white"
                    : step === currentStep
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step < currentStep ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  step
                )}
              </div>
              {step < 3 && (
                <div
                  className={`w-12 h-0.5 mx-2 ${
                    step < currentStep ? "bg-green-600" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold">{getStepTitle()}</h3>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Step 1: Repository Selection */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="grid gap-4">
                {project.repositories.map((repo) => (
                  <Card
                    key={repo.id}
                    className={`cursor-pointer transition-colors hover:bg-accent ${
                      selectedRepository?.id === repo.id
                        ? "ring-2 ring-primary"
                        : ""
                    }`}
                    onClick={() => handleRepositorySelect(repo)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <Github className="h-5 w-5" />
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base">{repo.fullName}</CardTitle>
                          {repo.description && (
                            <CardDescription className="text-sm">
                              {repo.description}
                            </CardDescription>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="outline">
                            <GitBranch className="h-3 w-3 mr-1" />
                            {repo.defaultBranch}
                          </Badge>
                          {repo.isPrivate && (
                            <Badge variant="secondary">Private</Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Scan Target Configuration */}
          {currentStep === 2 && selectedRepository && (
            <div className="space-y-6">
              {/* Selected Repository Info */}
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <Github className="h-5 w-5" />
                    <div>
                      <p className="font-medium">{selectedRepository.fullName}</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedRepository.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Branch Selection */}
              <div className="space-y-3">
                <Label htmlFor="branch">Branch</Label>
                <Select
                  value={scanConfig.branch}
                  onValueChange={(value) =>
                    setScanConfig((prev) => ({ ...prev, branch: value }))
                  }
                  disabled={loadingBranches}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingBranches ? "Loading branches..." : "Select branch"}>
                      {scanConfig.branch && (
                        <div className="flex items-center gap-2">
                          <GitBranch className="h-4 w-4" />
                          {scanConfig.branch}
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch.name} value={branch.name}>
                        <div className="flex items-center gap-2">
                          <GitBranch className="h-4 w-4" />
                          <span>{branch.name}</span>
                          {branch.name === selectedRepository.defaultBranch && (
                            <Badge variant="outline" className="text-xs">
                              default
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {loadingBranches && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading branches...
                  </div>
                )}
              </div>

              {/* Path Selection */}
              <div className="space-y-3">
                <Label htmlFor="path">Scan Path</Label>
                <Input
                  id="path"
                  value={scanConfig.path}
                  onChange={(e) =>
                    setScanConfig((prev) => ({ ...prev, path: e.target.value }))
                  }
                  placeholder="/src"
                />
                
                {/* Common Paths */}
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Common paths:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {COMMON_PATHS.map((commonPath) => (
                      <Button
                        key={commonPath.path}
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setScanConfig((prev) => ({ ...prev, path: commonPath.path }))
                        }
                        className="text-xs"
                      >
                        {commonPath.path}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Review & Confirm */}
          {currentStep === 3 && selectedRepository && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-semibold">Scan Configuration Summary</h4>
                
                <Card>
                  <CardContent className="pt-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">Repository</Label>
                        <p className="font-medium">{selectedRepository.fullName}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Branch</Label>
                        <div className="flex items-center gap-2">
                          <GitBranch className="h-4 w-4" />
                          <p className="font-medium">{scanConfig.branch}</p>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Path</Label>
                        <div className="flex items-center gap-2">
                          <FolderTree className="h-4 w-4" />
                          <p className="font-medium">{scanConfig.path}</p>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Estimated Duration</Label>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <p className="font-medium">2-5 minutes</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This scan will analyze your code for security vulnerabilities. 
                    You&apos;ll be redirected to the scan job page to monitor progress once the scan begins.
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <div>
            {currentStep > 1 && (
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
          </div>
          <div>
            {currentStep < 3 ? (
              <Button onClick={handleNext} disabled={!canProceed()}>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleCreateScan}
                disabled={creating || !canProceed()}
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Scan...
                  </>
                ) : (
                  <>
                    <Target className="h-4 w-4 mr-2" />
                    Start Scan
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}