"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { 
  GitFork, 
  Star, 
  ExternalLink, 
  Shield, 
  Clock,
  Search,
  RefreshCw,
  AlertCircle
} from "lucide-react";
import { Input } from "@/components/ui/input";

interface Repository {
  id: number;
  name: string;
  full_name: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
  updated_at: string;
  html_url: string;
  clone_url: string;
  size: number;
  default_branch: string;
  visibility: string;
  topics: string[];
}

export default function RepositoriesPage() {
  const { data: session, status } = useSession();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/login");
    }
  }, [status]);

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
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchRepositories();
    }
  }, [session]);

  const filteredRepositories = repositories.filter((repo) => {
    const matchesSearch = repo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         repo.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLanguage = selectedLanguage === "" || repo.language === selectedLanguage;
    return matchesSearch && matchesLanguage;
  });

  const languages = Array.from(new Set(repositories.map(repo => repo.language).filter(Boolean)));

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading repositories...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
        <div className="container mx-auto px-4 py-16">
          <nav className="flex justify-between items-center mb-16">
            <h1 className="text-2xl font-bold">Fortify - Repositories</h1>
            <Button asChild variant="outline">
              <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
          </nav>

          <div className="max-w-2xl mx-auto text-center">
            <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-400" />
            <h2 className="text-2xl font-bold mb-4">Error Loading Repositories</h2>
            <p className="text-gray-300 mb-6">{error}</p>
            <Button onClick={fetchRepositories} className="mr-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button asChild variant="outline">
              <Link href="/api/auth/signin">Reconnect GitHub</Link>
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
          <h1 className="text-2xl font-bold">Your GitHub Repositories</h1>
          <div className="flex gap-4">
            <Button onClick={fetchRepositories} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          </div>
        </nav>

        {/* Search and Filter */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search repositories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-700 text-white"
            />
          </div>
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white"
          >
            <option value="">All Languages</option>
            {languages.map((language) => (
              <option key={language} value={language}>
                {language}
              </option>
            ))}
          </select>
        </div>

        {/* Repository Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRepositories.map((repo) => (
            <Card key={repo.id} className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg text-white mb-2 flex items-center gap-2">
                      {repo.name}
                      {repo.visibility === "private" && <Badge variant="outline">Private</Badge>}
                    </CardTitle>
                    <CardDescription className="text-gray-300 text-sm">
                      {repo.description || "No description available"}
                    </CardDescription>
                  </div>
                  <Button asChild variant="ghost" size="sm">
                    <a href={repo.html_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Language and Topics */}
                  <div className="flex flex-wrap gap-2">
                    {repo.language && (
                      <Badge variant="secondary">{repo.language}</Badge>
                    )}
                    {repo.topics.slice(0, 3).map((topic) => (
                      <Badge key={topic} variant="outline" className="text-xs">
                        {topic}
                      </Badge>
                    ))}
                    {repo.topics.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{repo.topics.length - 3}
                      </Badge>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4" />
                      {repo.stars}
                    </div>
                    <div className="flex items-center gap-1">
                      <GitFork className="h-4 w-4" />
                      {repo.forks}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatDate(repo.updated_at)}
                    </div>
                  </div>

                  {/* Scan Button */}
                  <Button 
                    className="w-full" 
                    onClick={() => {
                      // TODO: Implement scan functionality
                      alert(`Scanning ${repo.name} - This feature will be implemented in the next step!`);
                    }}
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Scan for Vulnerabilities
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredRepositories.length === 0 && !loading && (
          <div className="text-center py-16">
            <p className="text-gray-400 text-lg">
              {repositories.length === 0 
                ? "No public repositories found. Make sure you have public repositories in your GitHub account."
                : "No repositories match your search criteria."
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
