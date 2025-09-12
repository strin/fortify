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
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { VulnerabilityCard } from "@/components/vulnerability/VulnerabilityCard";
import {
  RefreshCw,
  AlertCircle,
  Bug,
  CheckCircle,
  Loader2,
  ArrowLeft,
  Search,
  Filter,
  FileText,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Activity,
  Target,
  Shield,
  Clock,
  X
} from "lucide-react";

interface CodeVulnerability {
  id: string;
  title: string;
  description: string;
  severity: string;
  category: string;
  filePath: string;
  startLine: number;
  endLine?: number;
  codeSnippet: string;
  recommendation: string;
  metadata?: any;
  createdAt: string;
}

interface ScanJob {
  id: string;
  data: any;
  status: string;
  createdAt: string;
  finishedAt?: string;
  vulnerabilitiesFound: number;
}

interface VulnerabilitySummary {
  totalVulnerabilities: number;
  severityCounts: Record<string, number>;
  categoryCounts: Record<string, number>;
  topFiles: Array<{ filePath: string; count: number }>;
}

interface Pagination {
  page: number;
  limit: number;
  totalPages: number;
  totalCount: number;
  hasNext: boolean;
  hasPrev: boolean;
}

const severityColors = {
  CRITICAL: "bg-red-500 text-white",
  HIGH: "bg-orange-500 text-white",
  MEDIUM: "bg-yellow-500 text-black",
  LOW: "bg-blue-500 text-white",
  INFO: "bg-gray-500 text-white",
};

const categoryLabels: Record<string, string> = {
  INJECTION: "Injection",
  AUTHENTICATION: "Authentication",
  AUTHORIZATION: "Authorization",
  CRYPTOGRAPHY: "Cryptography",
  DATA_EXPOSURE: "Data Exposure",
  BUSINESS_LOGIC: "Business Logic",
  CONFIGURATION: "Configuration",
  DEPENDENCY: "Dependency",
  INPUT_VALIDATION: "Input Validation",
  OUTPUT_ENCODING: "Output Encoding",
  SESSION_MANAGEMENT: "Session Management",
  OTHER: "Other",
};

export default async function VulnerabilitiesPage({
  params,
}: {
  params: Promise<{ scanId: string }>;
}) {
  const { scanId } = await params;

  return <VulnerabilitiesContent scanId={scanId} />;
}

function VulnerabilitiesContent({ scanId }: { scanId: string }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [scanJob, setScanJob] = useState<ScanJob | null>(null);
  const [vulnerabilities, setVulnerabilities] = useState<CodeVulnerability[]>(
    []
  );
  const [summary, setSummary] = useState<VulnerabilitySummary | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedFile, setSelectedFile] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/login");
    }
  }, [status]);

  const fetchVulnerabilities = useCallback(
    async (page = 1) => {
      console.log("fetchVulnerabilities", scanId);
      try {
        setLoading(true);
        setError(null);

        const searchParams = new URLSearchParams({
          page: page.toString(),
          limit: "20",
        });

        if (selectedSeverity) searchParams.set("severity", selectedSeverity);
        if (selectedCategory) searchParams.set("category", selectedCategory);
        if (selectedFile) searchParams.set("filePath", selectedFile);

        const response = await fetch(
          `/api/scans/${scanId}/vulnerabilities?${searchParams}`
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch vulnerabilities");
        }

        setScanJob(data.scanJob);
        setVulnerabilities(data.vulnerabilities);
        setSummary(data.summary);
        setPagination(data.pagination);
        setCurrentPage(page);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unexpected error occurred"
        );
      } finally {
        setLoading(false);
      }
    },
    [scanId, selectedSeverity, selectedCategory, selectedFile]
  );

  useEffect(() => {
    if (session) {
      fetchVulnerabilities(1);
    }
  }, [
    session,
    scanId,
    selectedSeverity,
    selectedCategory,
    selectedFile,
    fetchVulnerabilities,
  ]);

  const filteredVulnerabilities = vulnerabilities.filter(
    (vuln) =>
      vuln.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vuln.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vuln.filePath.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const truncateFilePath = (path: string, maxLength = 50) => {
    if (path.length <= maxLength) return path;
    const parts = path.split("/");
    if (parts.length <= 2) return path;
    return `.../${parts.slice(-2).join("/")}`;
  };

  const handleFixWithAgent = async (vulnerabilityId: string): Promise<string | null> => {
    try {
      const response = await fetch("/api/fix/vulnerability", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          vulnerabilityId,
          fixOptions: {
            createPullRequest: true,
            autoMerge: false,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create fix job");
      }

      console.log("Fix job created:", data);
      return data.fixJobId;
    } catch (error) {
      console.error("Error creating fix job:", error);
      throw error;
    }
  };

  // Skeleton Components
  const SummaryCardSkeleton = () => (
    <Card className="bg-card border-border">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );

  const VulnerabilityCardSkeleton = () => (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-16 w-full" />
          </div>
          <div>
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-24 w-full" />
          </div>
          <div>
            <Skeleton className="h-4 w-32 mb-2" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-background text-white">
        <div className="container mx-auto px-4 py-8">
          {/* Navigation Skeleton */}
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
              <Skeleton className="h-9 w-16" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
            <div className="flex gap-4">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-32" />
            </div>
          </div>

          {/* Summary Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <SummaryCardSkeleton />
            <SummaryCardSkeleton />
            <SummaryCardSkeleton />
            <SummaryCardSkeleton />
          </div>

          {/* Filters Skeleton */}
          <Card className="bg-card border-border mb-8">
            <CardHeader>
              <Skeleton className="h-6 w-20" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
            </CardContent>
          </Card>

          {/* Vulnerabilities List Skeleton */}
          <div className="space-y-6">
            <VulnerabilityCardSkeleton />
            <VulnerabilityCardSkeleton />
            <VulnerabilityCardSkeleton />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background text-white">
        <div className="container mx-auto px-4 py-16">
          <nav className="flex justify-between items-center mb-16">
            <h1 className="text-2xl font-bold">Vulnerabilities</h1>
            <Button asChild variant="outline">
              <Link href="/scans">Back to Repositories</Link>
            </Button>
          </nav>

          <div className="max-w-2xl mx-auto text-center">
            <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-400" />
            <h2 className="text-2xl font-bold mb-4">
              Error Loading Vulnerabilities
            </h2>
            <p className="text-gray-300 mb-6">{error}</p>
            <Button
              onClick={() => fetchVulnerabilities(currentPage)}
              className="mr-4"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Navigation */}
        <nav className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Button onClick={() => router.back()} variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Bug className="h-6 w-6" />
                Vulnerabilities
              </h1>
              {scanJob && (
                <p className="text-gray-400">
                  Scan from {formatDate(scanJob.createdAt)} •{" "}
                  {scanJob.data?.repo || "Repository"}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-4">
            <Button
              onClick={() => fetchVulnerabilities(currentPage)}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button asChild variant="outline">
              <Link href="/scans">All Repositories</Link>
            </Button>
          </div>
        </nav>

        {/* Enhanced Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="group bg-card border-border hover:shadow-lg hover:shadow-red-500/10 transition-all duration-200 hover:scale-[1.02]">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground font-medium">Total Issues</p>
                    <p className="text-3xl font-bold tracking-tight">
                      {summary.totalVulnerabilities}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <TrendingUp className="h-3 w-3" />
                      <span>All severities</span>
                    </div>
                  </div>
                  <div className="rounded-full bg-red-500/10 p-3 group-hover:bg-red-500/20 transition-colors">
                    <Bug className="h-6 w-6 text-red-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="group bg-card border-border hover:shadow-lg hover:shadow-red-500/10 transition-all duration-200 hover:scale-[1.02]">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground font-medium">Critical Issues</p>
                    <p className="text-3xl font-bold text-red-400 tracking-tight">
                      {summary.severityCounts.CRITICAL || 0}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Target className="h-3 w-3" />
                      <span>Immediate attention</span>
                    </div>
                  </div>
                  <div className="rounded-full bg-red-500/10 p-3 group-hover:bg-red-500/20 transition-colors">
                    <AlertCircle className="h-6 w-6 text-red-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="group bg-card border-border hover:shadow-lg hover:shadow-orange-500/10 transition-all duration-200 hover:scale-[1.02]">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground font-medium">High Priority</p>
                    <p className="text-3xl font-bold text-orange-400 tracking-tight">
                      {summary.severityCounts.HIGH || 0}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Activity className="h-3 w-3" />
                      <span>High priority</span>
                    </div>
                  </div>
                  <div className="rounded-full bg-orange-500/10 p-3 group-hover:bg-orange-500/20 transition-colors">
                    <AlertCircle className="h-6 w-6 text-orange-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="group bg-card border-border hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-200 hover:scale-[1.02]">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground font-medium">Affected Files</p>
                    <p className="text-3xl font-bold tracking-tight">
                      {summary.topFiles.length}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <FileText className="h-3 w-3" />
                      <span>Files with issues</span>
                    </div>
                  </div>
                  <div className="rounded-full bg-blue-500/10 p-3 group-hover:bg-blue-500/20 transition-colors">
                    <FileText className="h-6 w-6 text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Enhanced Filters */}
        <Card className="bg-card border-border mb-8 hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-xl">
                <div className="rounded-full bg-primary/10 p-2">
                  <Filter className="h-5 w-5 text-primary" />
                </div>
                Filters & Search
              </CardTitle>
              {(selectedSeverity || selectedCategory || selectedFile || searchTerm) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedSeverity("");
                    setSelectedCategory("");
                    setSelectedFile("");
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear all
                </Button>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Filter vulnerabilities to focus on what matters most
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search vulnerabilities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-card border-border h-11 focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
                <SelectTrigger className="h-11 bg-card border-border">
                  <SelectValue placeholder="All Severities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Severities</SelectItem>
                  <SelectItem value="CRITICAL">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      Critical
                    </div>
                  </SelectItem>
                  <SelectItem value="HIGH">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                      High
                    </div>
                  </SelectItem>
                  <SelectItem value="MEDIUM">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                      Medium
                    </div>
                  </SelectItem>
                  <SelectItem value="LOW">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      Low
                    </div>
                  </SelectItem>
                  <SelectItem value="INFO">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                      Info
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="h-11 bg-card border-border">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Categories</SelectItem>
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedFile} onValueChange={setSelectedFile}>
                <SelectTrigger className="h-11 bg-card border-border">
                  <SelectValue placeholder="All Files" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Files</SelectItem>
                  {summary?.topFiles.map((file) => (
                    <SelectItem key={file.filePath} value={file.filePath}>
                      <div className="flex items-center justify-between w-full">
                        <span className="truncate">{truncateFilePath(file.filePath, 30)}</span>
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {file.count}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Active Filters Display */}
            {(selectedSeverity || selectedCategory || selectedFile || searchTerm) && (
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <span className="text-sm text-muted-foreground">Active filters:</span>
                <div className="flex flex-wrap gap-2">
                  {searchTerm && (
                    <Badge variant="secondary" className="text-xs">
                      Search: {searchTerm}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-1 h-3 w-3 p-0 hover:bg-transparent"
                        onClick={() => setSearchTerm("")}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  )}
                  {selectedSeverity && (
                    <Badge variant="secondary" className="text-xs">
                      Severity: {selectedSeverity}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-1 h-3 w-3 p-0 hover:bg-transparent"
                        onClick={() => setSelectedSeverity("")}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  )}
                  {selectedCategory && (
                    <Badge variant="secondary" className="text-xs">
                      Category: {categoryLabels[selectedCategory]}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-1 h-3 w-3 p-0 hover:bg-transparent"
                        onClick={() => setSelectedCategory("")}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  )}
                  {selectedFile && (
                    <Badge variant="secondary" className="text-xs">
                      File: {truncateFilePath(selectedFile, 20)}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-1 h-3 w-3 p-0 hover:bg-transparent"
                        onClick={() => setSelectedFile("")}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vulnerabilities List */}
        <div className="space-y-4">
          {filteredVulnerabilities.map((vuln) => (
            <VulnerabilityCard
              key={vuln.id}
              vulnerability={vuln}
              onFixWithAgent={handleFixWithAgent}
              scanJobId={scanId}
              showFullDetails={true}
            />
          ))}
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex justify-between items-center mt-8">
            <div className="text-sm text-gray-400">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
              {Math.min(
                pagination.page * pagination.limit,
                pagination.totalCount
              )}{" "}
              of {pagination.totalCount} vulnerabilities
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => fetchVulnerabilities(pagination.page - 1)}
                disabled={!pagination.hasPrev}
                variant="outline"
                size="sm"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="flex items-center px-3 text-sm">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                onClick={() => fetchVulnerabilities(pagination.page + 1)}
                disabled={!pagination.hasNext}
                variant="outline"
                size="sm"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {filteredVulnerabilities.length === 0 && !loading && (
          <div className="mt-8">
            {vulnerabilities.length === 0 ? (
              <EmptyState
                icon={Shield}
                title="No vulnerabilities found"
                description="Excellent! This security scan didn't find any vulnerabilities in your code. Your codebase appears to be secure based on our analysis."
                action={{
                  label: "Run New Scan",
                  onClick: () => window.history.back(),
                  icon: RefreshCw,
                  variant: "default" as const,
                }}
                secondaryAction={{
                  label: "View Scan Details",
                  onClick: () => fetchVulnerabilities(currentPage),
                  icon: Activity,
                }}
                size="lg"
              />
            ) : (
              <EmptyState
                icon={Search}
                title="No matching vulnerabilities"
                description={`No vulnerabilities match your current search and filter criteria. ${searchTerm ? `Try searching for something different than "${searchTerm}"` : ''} or adjust your filters to see more results.`}
                action={{
                  label: "Clear All Filters",
                  onClick: () => {
                    setSearchTerm("");
                    setSelectedSeverity("");
                    setSelectedCategory("");
                    setSelectedFile("");
                  },
                  icon: X,
                  variant: "outline" as const,
                }}
                size="default"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
