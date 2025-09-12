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

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-background text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading vulnerabilities...</p>
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

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Total Issues</p>
                    <p className="text-2xl font-bold">
                      {summary.totalVulnerabilities}
                    </p>
                  </div>
                  <Bug className="h-8 w-8 text-red-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Critical</p>
                    <p className="text-2xl font-bold text-red-400">
                      {summary.severityCounts.CRITICAL || 0}
                    </p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-red-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">High</p>
                    <p className="text-2xl font-bold text-orange-400">
                      {summary.severityCounts.HIGH || 0}
                    </p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-orange-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Affected Files</p>
                    <p className="text-2xl font-bold">
                      {summary.topFiles.length}
                    </p>
                  </div>
                  <FileText className="h-8 w-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="bg-gray-800 border-gray-700 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search vulnerabilities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-700 border-gray-600 text-white"
                />
              </div>

              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
              >
                <option value="">All Severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
                <option value="INFO">Info</option>
              </select>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
              >
                <option value="">All Categories</option>
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>

              <select
                value={selectedFile}
                onChange={(e) => setSelectedFile(e.target.value)}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
              >
                <option value="">All Files</option>
                {summary?.topFiles.map((file) => (
                  <option key={file.filePath} value={file.filePath}>
                    {truncateFilePath(file.filePath)} ({file.count})
                  </option>
                ))}
              </select>
            </div>
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
          <div className="text-center py-16">
            <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-400" />
            <h2 className="text-xl font-semibold mb-2">
              No Vulnerabilities Found
            </h2>
            <p className="text-gray-400 text-lg">
              {vulnerabilities.length === 0
                ? "Great! This scan didn't find any security vulnerabilities."
                : "No vulnerabilities match your current filters."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
