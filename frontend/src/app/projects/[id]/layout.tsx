"use client";

import { useState, useEffect, ReactNode } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  ArrowLeft,
  Github,
  Play,
} from "lucide-react";

interface Repository {
  id: string;
  fullName: string;
  description: string | null;
  provider: string;
  defaultBranch: string;
  isPrivate: boolean;
  lastScanAt: string | null;
  repoUrl: string;
  scanTargets: any[];
  totalScanTargets: number;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastScanAt: string | null;
  repositories: Repository[];
}

interface ProjectLayoutProps {
  children: ReactNode;
  params: Promise<{ id: string }>;
}

export default function ProjectLayout({ children, params }: ProjectLayoutProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string>("");

  // Get project ID from params
  useEffect(() => {
    params.then((p) => setProjectId(p.id));
  }, [params]);

  // Check authentication and fetch project
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated" && projectId) {
      fetchProject();
    }
  }, [status, router, projectId]);

  const fetchProject = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/projects/${projectId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch project");
      }

      setProject(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch project");
    } finally {
      setLoading(false);
    }
  };

  const getCurrentTab = () => {
    if (pathname.includes("/scans")) return "scans";
    if (pathname.includes("/compliance")) return "compliance";
    if (pathname.includes("/settings")) return "settings";
    return "overview";
  };

  const getTabNavigation = () => {
    const baseUrl = `/projects/${projectId}`;
    const currentTab = getCurrentTab();
    
    const tabs = [
      { id: "overview", label: "Overview", href: baseUrl },
      { id: "scans", label: "Scans", href: `${baseUrl}/scans` },
      { id: "compliance", label: "Compliance", href: `${baseUrl}/compliance` },
      { id: "settings", label: "Settings", href: `${baseUrl}/settings` },
    ];

    return (
      <div className="flex border-b border-border">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={tab.href}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              currentTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    );
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-background text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-8">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-64" />
          </div>

          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <Skeleton className="h-8 w-48 mb-2" />
                <Skeleton className="h-5 w-80" />
              </div>
              <div className="flex gap-3">
                <Skeleton className="h-9 w-24" />
              </div>
            </div>
          </div>

          <div className="flex border-b border-border mb-6">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-24 mr-6" />
            ))}
          </div>

          <div className="space-y-6">
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated" || error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 mx-auto mb-4 text-destructive" />
          <h2 className="text-xl font-semibold mb-2 text-foreground">
            {error || "Access Denied"}
          </h2>
          <p className="text-muted-foreground mb-4">
            {error || "You need to be logged in to view this project."}
          </p>
          <Button onClick={() => router.push("/projects")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Link href="/projects">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Projects
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">{project.name}</h1>
                {project.repositories.length > 0 && (
                  <div className="flex items-center gap-2">
                    {project.repositories.map((repo, index) => (
                      <div key={repo.id} className="flex items-center gap-1">
                        {index > 0 && (
                          <span className="text-muted-foreground">•</span>
                        )}
                        <a
                          href={
                            repo.provider === "GITHUB"
                              ? `https://github.com/${repo.fullName}`
                              : repo.repoUrl
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted hover:bg-accent transition-colors text-sm text-muted-foreground hover:text-foreground"
                          title={`Open ${
                            repo.fullName
                          } on ${repo.provider.toLowerCase()}`}
                        >
                          <Github className="h-3 w-3" />
                          <span>{repo.fullName}</span>
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <Button variant="cta">
              <Play className="h-4 w-4 mr-2" />
              Run Scan
            </Button>
          </div>

          {project.description && (
            <p className="text-muted-foreground">{project.description}</p>
          )}
        </div>

        {/* Tab Navigation */}
        {getTabNavigation()}

        {/* Tab Content */}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}