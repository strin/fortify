"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { 
  Shield, 
  Clock,
  Search,
  RefreshCw,
  AlertCircle,
  GitBranch,
  Bug,
  CheckCircle,
  XCircle,
  Loader2
} from "lucide-react";
import { Input } from "@/components/ui/input";

interface ScannedRepository {
  owner: string;
  repo: string;
  fullName: string;
  totalScans: number;
  lastScanned: string;
  totalVulnerabilities: number;
  highestSeverityFound: string;
  completedScans: number;
  failedScans: number;
}

const severityColors = {
  CRITICAL: "bg-red-500",
  HIGH: "bg-orange-500", 
  MEDIUM: "bg-yellow-500",
  LOW: "bg-blue-500",
  INFO: "bg-gray-500",
};

const severityTextColors = {
  CRITICAL: "text-red-400",
  HIGH: "text-orange-400",
  MEDIUM: "text-yellow-400", 
  LOW: "text-blue-400",
  INFO: "text-gray-400",
};

export default function ScannedRepositoriesPage() {
  const { data: session, status } = useSession();
  const [repositories, setRepositories] = useState<ScannedRepository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/login");
    }
  }, [status]);

  const fetchScannedRepositories = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch("/api/scans/repositories");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch scanned repositories");
      }

      setRepositories(data.repositories);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchScannedRepositories();
    }
  }, [session]);

  const filteredRepositories = repositories.filter((repo) =>
    repo.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading scanned repositories...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
        <div className="container mx-auto px-4 py-16">
          <nav className="flex justify-between items-center mb-16">
            <h1 className="text-2xl font-bold">Fortify - Scanned Repositories</h1>
            <Button asChild variant="outline">
              <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
          </nav>

          <div className="max-w-2xl mx-auto text-center">
            <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-400" />
            <h2 className="text-2xl font-bold mb-4">Error Loading Repositories</h2>
            <p className="text-gray-300 mb-6">{error}</p>
            <Button onClick={fetchScannedRepositories} className="mr-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto px-4 py-8">
        <nav className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Scanned Repositories</h1>
          <div className="flex gap-4">
            <Button onClick={fetchScannedRepositories} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button asChild variant="outline">
              <Link href="/repositories">Scan New Repository</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          </div>
        </nav>

        {/* Search */}
        <div className="mb-8">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search repositories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-700 text-white"
            />
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Repositories</p>
                  <p className="text-2xl font-bold">{repositories.length}</p>
                </div>
                <GitBranch className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Scans</p>
                  <p className="text-2xl font-bold">
                    {repositories.reduce((sum, repo) => sum + repo.totalScans, 0)}
                  </p>
                </div>
                <Shield className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Vulnerabilities</p>
                  <p className="text-2xl font-bold">
                    {repositories.reduce((sum, repo) => sum + repo.totalVulnerabilities, 0)}
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
                  <p className="text-sm text-gray-400">Critical Issues</p>
                  <p className="text-2xl font-bold text-red-400">
                    {repositories.filter(repo => repo.highestSeverityFound === 'CRITICAL').length}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Repository List */}
        <div className="space-y-4">
          {filteredRepositories.map((repo) => (
            <Card key={repo.fullName} className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg text-white mb-2 flex items-center gap-2">
                      <GitBranch className="h-5 w-5" />
                      {repo.fullName}
                      <Badge 
                        variant="outline" 
                        className={`${severityTextColors[repo.highestSeverityFound as keyof typeof severityTextColors]} border-current`}
                      >
                        {repo.highestSeverityFound}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-gray-300 text-sm">
                      Last scanned: {formatDate(repo.lastScanned)}
                    </CardDescription>
                  </div>
                  <Button asChild>
                    <Link href={`/scans/${repo.owner}/${repo.repo}`}>
                      View Scans
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-blue-400" />
                    <span className="text-gray-300">Total Scans:</span>
                    <span className="font-semibold">{repo.totalScans}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Bug className="h-4 w-4 text-red-400" />
                    <span className="text-gray-300">Vulnerabilities:</span>
                    <span className="font-semibold">{repo.totalVulnerabilities}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span className="text-gray-300">Completed:</span>
                    <span className="font-semibold">{repo.completedScans}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-400" />
                    <span className="text-gray-300">Failed:</span>
                    <span className="font-semibold">{repo.failedScans}</span>
                  </div>
                </div>

                {/* Severity indicator */}
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-sm text-gray-400">Risk Level:</span>
                  <div className={`w-3 h-3 rounded-full ${severityColors[repo.highestSeverityFound as keyof typeof severityColors]}`}></div>
                  <span className={`text-sm font-medium ${severityTextColors[repo.highestSeverityFound as keyof typeof severityTextColors]}`}>
                    {repo.highestSeverityFound}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredRepositories.length === 0 && !loading && (
          <div className="text-center py-16">
            <Shield className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-semibold mb-2">No Scanned Repositories Found</h2>
            <p className="text-gray-400 text-lg mb-6">
              {repositories.length === 0 
                ? "You haven't scanned any repositories yet. Start by scanning your first repository."
                : "No repositories match your search criteria."
              }
            </p>
            {repositories.length === 0 && (
              <Button asChild>
                <Link href="/repositories">
                  <Shield className="h-4 w-4 mr-2" />
                  Scan Your First Repository
                </Link>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
