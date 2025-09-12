"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import Link from "next/link";
import { 
  GitFork, 
  Star, 
  ExternalLink, 
  Clock,
  Search,
  RefreshCw,
  AlertCircle,
  Github,
  Filter,
  TrendingUp,
  Code,
  Activity,
  Loader2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Repository {
  id: number;
  name: string;
  fullName: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
  updatedAt: string;
  htmlUrl: string;
  cloneUrl: string;
  size: number;
  defaultBranch: string;
  private: boolean;
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

  // Skeleton Components
  const RepositoryCardSkeleton = () => (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-5 w-16" />
            </div>
            <Skeleton className="h-4 w-full max-w-xs" />
          </div>
          <Skeleton className="h-8 w-8" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-14" />
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-10 w-full" />
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
            <Skeleton className="h-8 w-64" />
            <div className="flex gap-4">
              <Skeleton className="h-10 w-20" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>

          {/* Search and Filter Skeleton */}
          <div className="mb-8 flex flex-col sm:flex-row gap-4">
            <Skeleton className="flex-1 h-10" />
            <Skeleton className="h-10 w-32" />
          </div>

          {/* Repository Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <RepositoryCardSkeleton key={i} />
            ))}
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
            <h1 className="text-2xl font-bold">Fortify - Repositories</h1>
            <Button asChild variant="outline">
              <Link href="/projects">Back to Projects</Link>
            </Button>
          </nav>

          <div className="max-w-2xl mx-auto text-center">
            <AlertCircle className="h-16 w-16 mx-auto mb-4 text-destructive" />
            <h2 className="text-2xl font-bold mb-4">Error Loading Repositories</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
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
    <div className="min-h-screen bg-background text-white">
      <div className="container mx-auto px-4 py-8">
        <nav className="flex justify-between items-center mb-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Github className="h-8 w-8 text-primary" />
              Your Repositories
            </h1>
            <p className="text-muted-foreground text-lg">
              Connect your GitHub repositories to start scanning for vulnerabilities
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={fetchRepositories} 
              variant="outline" 
              size="sm"
              className="hover:scale-105 transition-transform"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button asChild variant="outline">
              <Link href="/projects">View Projects</Link>
            </Button>
          </div>
        </nav>

        {/* Enhanced Search and Filter */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search repositories by name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-card border-border text-foreground h-11 focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            <div className="flex gap-3">
              <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                <SelectTrigger className="w-48 bg-card border-border">
                  <div className="flex items-center gap-2">
                    <Code className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="All Languages" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Languages</SelectItem>
                  {languages.map((language) => (
                    <SelectItem key={language} value={language}>
                      {language}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" className="h-11 px-4">
                <Filter className="h-4 w-4 mr-2" />
                More Filters
              </Button>
            </div>
          </div>
          
          {/* Results Count */}
          {!loading && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Found {filteredRepositories.length} of {repositories.length} repositories
                {searchTerm && ` matching "${searchTerm}"`}
                {selectedLanguage && ` in ${selectedLanguage}`}
              </p>
              {filteredRepositories.length !== repositories.length && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedLanguage("");
                  }}
                  className="text-sm"
                >
                  Clear filters
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Enhanced Repository Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRepositories.map((repo) => (
            <Card key={repo.id} className="group bg-card border-border hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 hover:scale-[1.02] overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2 flex items-center gap-2">
                      <Github className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span className="truncate">{repo.name}</span>
                      {repo.private && (
                        <Badge variant="secondary" className="bg-orange-500/10 text-orange-400 border-orange-500/20">
                          Private
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="text-muted-foreground text-sm line-clamp-2">
                      {repo.description || "No description available"}
                    </CardDescription>
                  </div>
                  <Button 
                    asChild 
                    variant="ghost" 
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 flex-shrink-0"
                  >
                    <a href={repo.htmlUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Language and Topics */}
                <div className="flex flex-wrap gap-2">
                  {repo.language && (
                    <Badge variant="secondary" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                      <Code className="h-3 w-3 mr-1" />
                      {repo.language}
                    </Badge>
                  )}
                  {repo.topics.slice(0, 2).map((topic) => (
                    <Badge key={topic} variant="outline" className="text-xs">
                      {topic}
                    </Badge>
                  ))}
                  {repo.topics.length > 2 && (
                    <Badge variant="outline" className="text-xs">
                      +{repo.topics.length - 2} more
                    </Badge>
                  )}
                </div>

                {/* Enhanced Stats */}
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span className="font-medium">{repo.stars.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <GitFork className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">{repo.forks.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span className="font-medium text-xs">{formatDate(repo.updatedAt)}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button 
                    asChild
                    variant="outline"
                    className="flex-1 group-hover:border-primary/20 transition-colors"
                  >
                    <Link href={`/scans/${repo.fullName.split('/')[0]}/${repo.fullName.split('/')[1]}`}>
                      <Activity className="h-4 w-4 mr-2" />
                      View Scans
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredRepositories.length === 0 && !loading && (
          <div className="mt-12">
            {repositories.length === 0 ? (
              <EmptyState
                icon={Github}
                title="No repositories found"
                description="We couldn't find any public repositories in your GitHub account. Make sure you have public repositories or check your GitHub permissions."
                action={{
                  label: "Refresh Repositories",
                  onClick: fetchRepositories,
                  icon: RefreshCw,
                }}
                secondaryAction={{
                  label: "Check GitHub Settings",
                  onClick: () => window.open('https://github.com/settings/repositories', '_blank'),
                  icon: ExternalLink,
                }}
                size="lg"
              />
            ) : (
              <EmptyState
                icon={Search}
                title="No matching repositories"
                description={`No repositories match your current search criteria. ${searchTerm ? `Try searching for something different than "${searchTerm}"` : ''} ${selectedLanguage ? `or select a different language than ${selectedLanguage}` : ''}.`}
                action={{
                  label: "Clear All Filters",
                  onClick: () => {
                    setSearchTerm("");
                    setSelectedLanguage("");
                  },
                  icon: RefreshCw,
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
