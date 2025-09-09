"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Github, ArrowLeft, ArrowRight, Check } from "lucide-react";
import Link from "next/link";

interface Repository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  default_branch: string;
  language: string | null;
  stargazers_count: number;
  updated_at: string;
}

interface Branch {
  name: string;
  commit: {
    sha: string;
  };
}

export default function NewScanTargetPage() {
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
  const [subPath, setSubPath] = useState("");
  const [scanTargetName, setScanTargetName] = useState("");
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
      
      setRepositories(data.repositories || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch repositories");
    } finally {
      setLoading(false);
    }
  };

  // Fetch branches for selected repository
  const fetchBranches = async (repo: Repository) => {
    try {
      setLoading(true);
      setError(null);
      
      const [owner, repoName] = repo.full_name.split("/");
      const response = await fetch(`/api/repositories/branches/${owner}/${repoName}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch branches");
      }
      
      setBranches(data.branches || []);
      setSelectedBranch(repo.default_branch); // Set default branch
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch branches");
    } finally {
      setLoading(false);
    }
  };

  // Handle repository selection
  const handleRepositorySelect = async (repo: Repository) => {
    setSelectedRepo(repo);
    setScanTargetName(`${repo.name} - ${repo.default_branch}`); // Auto-generate name
    await fetchBranches(repo);
    setStep(2);
  };

  // Handle scan target creation
  const handleCreateScanTarget = async () => {
    if (!selectedRepo || !selectedBranch) {
      setError("Please complete all required fields");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/scan-targets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: scanTargetName,
          description: description || null,
          repoUrl: selectedRepo.html_url,
          branch: selectedBranch,
          subPath: subPath || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create scan target");
      }

      // Redirect to scan target detail page
      router.push(`/scan-targets/${data.scanTarget.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create scan target");
    } finally {
      setLoading(false);
    }
  };

  // Filter repositories based on search
  const filteredRepositories = repositories.filter(repo =>
    repo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    repo.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ""
  );

  // Show loading state while checking authentication
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if redirecting to login
  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => step > 1 ? setStep(step - 1) : router.back()}
                className="text-gray-400 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <h1 className="text-3xl font-bold">Create New Scan Target</h1>
            </div>
          </div>
          
          {/* Progress indicator */}
          <div className="flex items-center gap-4 mb-6">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-blue-400' : 'text-gray-500'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-blue-600' : 'bg-gray-600'}`}>
                {step > 1 ? <Check className="h-4 w-4" /> : "1"}
              </div>
              <span>Repository</span>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-500" />
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-blue-400' : 'text-gray-500'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-blue-600' : 'bg-gray-600'}`}>
                {step > 2 ? <Check className="h-4 w-4" /> : "2"}
              </div>
              <span>Configuration</span>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-500" />
            <div className={`flex items-center gap-2 ${step >= 3 ? 'text-blue-400' : 'text-gray-500'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-blue-600' : 'bg-gray-600'}`}>
                "3"
              </div>
              <span>Review</span>
            </div>
          </div>
        </div>

        {/* Error display */}
        {error && (
          <Card className="mb-6 bg-red-900/20 border-red-500/50">
            <CardContent className="pt-6">
              <p className="text-red-400">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Step 1: Repository Selection */}
        {step === 1 && (
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Github className="h-5 w-5" />
                Select Repository
              </CardTitle>
              <CardDescription>
                Choose the GitHub repository you want to scan for security vulnerabilities.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Search */}
              <div className="mb-6">
                <Input
                  placeholder="Search repositories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-gray-900 border-gray-600"
                />
              </div>

              {/* Repository list */}
              {loading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  <p className="text-gray-400">Loading repositories...</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredRepositories.map((repo) => (
                    <div
                      key={repo.id}
                      className="p-4 bg-gray-900 rounded-lg border border-gray-700 hover:border-gray-600 cursor-pointer transition-colors"
                      onClick={() => handleRepositorySelect(repo)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-white">{repo.name}</h3>
                            {repo.private && (
                              <span className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded">
                                Private
                              </span>
                            )}
                            {repo.language && (
                              <span className="px-2 py-1 text-xs bg-blue-900 text-blue-300 rounded">
                                {repo.language}
                              </span>
                            )}
                          </div>
                          {repo.description && (
                            <p className="text-gray-400 text-sm mb-2">{repo.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>⭐ {repo.stargazers_count}</span>
                            <span>Updated {new Date(repo.updated_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-500 mt-1" />
                      </div>
                    </div>
                  ))}
                  {filteredRepositories.length === 0 && !loading && (
                    <div className="text-center py-8 text-gray-400">
                      <p>No repositories found matching your search.</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 2: Configuration */}
        {step === 2 && selectedRepo && (
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle>Configure Scan Target</CardTitle>
              <CardDescription>
                Set up the scanning parameters for {selectedRepo.name}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Scan Target Name */}
              <div>
                <Label htmlFor="name">Scan Target Name *</Label>
                <Input
                  id="name"
                  value={scanTargetName}
                  onChange={(e) => setScanTargetName(e.target.value)}
                  className="bg-gray-900 border-gray-600 mt-2"
                  placeholder="Enter a descriptive name"
                />
              </div>

              {/* Branch Selection */}
              <div>
                <Label htmlFor="branch">Branch *</Label>
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger className="bg-gray-900 border-gray-600 mt-2">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-600">
                    {branches.map((branch) => (
                      <SelectItem key={branch.name} value={branch.name}>
                        {branch.name}
                        {branch.name === selectedRepo.default_branch && " (default)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Subpath */}
              <div>
                <Label htmlFor="subpath">Subpath (optional)</Label>
                <Input
                  id="subpath"
                  value={subPath}
                  onChange={(e) => setSubPath(e.target.value)}
                  className="bg-gray-900 border-gray-600 mt-2"
                  placeholder="e.g., src/, backend/ (leave empty for entire repository)"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Specify a subdirectory to scan only part of the repository
                </p>
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-gray-900 border-gray-600 mt-2"
                  placeholder="Add notes about this scan target..."
                  rows={3}
                />
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1"
                >
                  Back to Repository
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={!scanTargetName || !selectedBranch}
                  className="flex-1"
                >
                  Review & Create
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Review */}
        {step === 3 && selectedRepo && (
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle>Review Scan Target</CardTitle>
              <CardDescription>
                Please review your scan target configuration before creating.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Configuration summary */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Repository</h4>
                  <div className="bg-gray-900 p-4 rounded border border-gray-700">
                    <p className="font-medium">{selectedRepo.name}</p>
                    <p className="text-sm text-gray-400">{selectedRepo.full_name}</p>
                    {selectedRepo.description && (
                      <p className="text-sm text-gray-300 mt-2">{selectedRepo.description}</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-3">Scan Configuration</h4>
                  <div className="bg-gray-900 p-4 rounded border border-gray-700 space-y-2">
                    <div>
                      <span className="text-sm text-gray-400">Name:</span>
                      <p className="font-medium">{scanTargetName}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-400">Branch:</span>
                      <p className="font-medium">{selectedBranch}</p>
                    </div>
                    {subPath && (
                      <div>
                        <span className="text-sm text-gray-400">Subpath:</span>
                        <p className="font-medium">{subPath}</p>
                      </div>
                    )}
                    {description && (
                      <div>
                        <span className="text-sm text-gray-400">Description:</span>
                        <p className="text-sm">{description}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="flex-1"
                  disabled={loading}
                >
                  Back to Configuration
                </Button>
                <Button
                  onClick={handleCreateScanTarget}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Scan Target"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
