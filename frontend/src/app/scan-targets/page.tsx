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
import Link from "next/link";
import {
  Search,
  Plus,
  RefreshCw,
  AlertCircle,
  GitBranch,
  Calendar,
  Shield,
  MoreHorizontal,
  ExternalLink,
  Settings,
  Star,
  Play,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateScanTargetDialog } from "@/components/scan-target/create-scan-target-dialog";

interface VulnerabilityStats {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  total: number;
}

interface ScanTarget {
  id: string;
  name: string;
  description: string | null;
  repoUrl: string;
  branch: string;
  subPath: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastScanAt: string | null;
  owner: string;
  repo: string;
  lastScan: {
    id: string;
    status: string;
    createdAt: string;
    vulnerabilitiesFound: number;
  } | null;
  vulnerabilityStats: VulnerabilityStats;
  totalScans: number;
}

export default function ScanTargetsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [scanTargets, setScanTargets] = useState<ScanTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [scanningTargets, setScanningTargets] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/login");
    }
  }, [status]);

  const fetchScanTargets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);

      const response = await fetch(`/api/scan-targets?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch scan projects");
      }

      setScanTargets(data.scanTargets);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    if (session) {
      fetchScanTargets();
    }
  }, [session, searchTerm, fetchScanTargets]);

  const handleTriggerScan = async (scanTargetId: string) => {
    try {
      setScanningTargets((prev) => new Set(prev).add(scanTargetId));

      const response = await fetch(`/api/scan-targets/${scanTargetId}/scan`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to trigger scan");
      }

      const data = await response.json();

      // Redirect to the job page if we got a job ID
      if (data.scanJobId) {
        router.push(`/jobs/${data.scanJobId}`);
        return;
      }

      // Fallback: refresh the scan targets to show updated status
      await fetchScanTargets();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to trigger scan");
    } finally {
      setScanningTargets((prev) => {
        const newSet = new Set(prev);
        newSet.delete(scanTargetId);
        return newSet;
      });
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year:
        date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return (
          <Badge variant="default" className="bg-green-600">
            ✅ Completed
          </Badge>
        );
      case "FAILED":
        return <Badge variant="destructive">❌ Failed</Badge>;
      case "IN_PROGRESS":
        return <Badge variant="secondary">⏳ Running</Badge>;
      case "PENDING":
        return <Badge variant="outline">⏳ Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getVulnerabilityBadges = (stats: VulnerabilityStats) => {
    const badges: React.JSX.Element[] = [];
    if (stats.critical > 0)
      badges.push(
        <Badge key="critical" variant="destructive">
          {stats.critical} Critical
        </Badge>
      );
    if (stats.high > 0)
      badges.push(
        <Badge key="high" variant="destructive" className="bg-orange-600">
          {stats.high} High
        </Badge>
      );
    if (stats.medium > 0)
      badges.push(
        <Badge key="medium" variant="secondary">
          {stats.medium} Medium
        </Badge>
      );
    if (stats.low > 0)
      badges.push(
        <Badge key="low" variant="outline">
          {stats.low} Low
        </Badge>
      );

    return badges.length > 0
      ? badges
      : [
          <Badge key="none" variant="outline" className="text-green-600">
            No vulnerabilities
          </Badge>,
        ];
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <Skeleton className="h-9 w-48 mb-2" />
              <Skeleton className="h-5 w-80" />
            </div>
            <div className="flex gap-4">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-24" />
            </div>
          </div>

          <div className="mb-8">
            <Skeleton className="h-10 w-64" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="hover:bg-accent/50 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                      <Skeleton className="h-4 w-24 mb-2" />
                      <div className="flex items-center gap-4">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                    <Skeleton className="h-8 w-8" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    <Skeleton className="h-4 w-full" />
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-6 w-18" />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Skeleton className="h-8 flex-1" />
                      <Skeleton className="h-8 w-24" />
                    </div>
                    <Skeleton className="h-3 w-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="container mx-auto px-4 py-16">
          <nav className="flex justify-between items-center mb-16">
            <h1 className="text-2xl font-bold">Fortify - Scan Projects</h1>
            <Button asChild variant="outline">
              <Link href="/scan-targets">Back to Scan Projects</Link>
            </Button>
          </nav>

          <div className="max-w-2xl mx-auto text-center">
            <AlertCircle className="h-16 w-16 mx-auto mb-4 text-destructive" />
            <h2 className="text-2xl font-bold mb-4">
              Error Loading Scan Projects
            </h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={fetchScanTargets} className="mr-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Scan Projects</h1>
            <p className="text-muted-foreground">
              Manage your code security scanning projects
            </p>
          </div>
          <div className="flex gap-4">
            <Button onClick={fetchScanTargets} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add New
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Scan Projects Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {scanTargets.map((target) => (
            <Card
              key={target.id}
              className="hover:bg-accent/50 transition-colors"
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Shield className="h-4 w-4 text-primary" />
                      <CardTitle className="text-lg truncate">
                        {target.name}
                      </CardTitle>
                      {!target.isActive && (
                        <Badge variant="outline" className="text-xs">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-sm mb-2">
                      {target.owner}/{target.repo}
                    </CardDescription>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <GitBranch className="h-3 w-3" />
                        {target.branch}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(target.lastScanAt)}
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/scan-targets/${target.id}`}>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View Details
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Settings className="h-4 w-4 mr-2" />
                        Configure
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Star className="h-4 w-4 mr-2" />
                        Add to Favorites
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="space-y-4">
                  {/* Description */}
                  {target.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {target.description}
                    </p>
                  )}

                  {/* Last Scan Status */}
                  {target.lastScan && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Last scan:
                      </span>
                      {getStatusBadge(target.lastScan.status)}
                    </div>
                  )}

                  {/* Vulnerability Stats */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1">
                      {getVulnerabilityBadges(target.vulnerabilityStats)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => handleTriggerScan(target.id)}
                      disabled={
                        !target.isActive || scanningTargets.has(target.id)
                      }
                    >
                      {scanningTargets.has(target.id) ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4 mr-2" />
                      )}
                      {scanningTargets.has(target.id)
                        ? "Scanning..."
                        : "Scan Now"}
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/scan-targets/${target.id}`}>
                        View Scans
                      </Link>
                    </Button>
                  </div>

                  {/* Stats */}
                  <div className="text-xs text-muted-foreground pt-2 border-t border-border">
                    Total scans: {target.totalScans} • Created{" "}
                    {formatDate(target.createdAt)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {scanTargets.length === 0 && !loading && (
          <div className="text-center py-16">
            <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No Scan Projects Yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Get started by creating your first scan project. Connect a
              repository and configure security scanning for your codebase.
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Scan Project
            </Button>
          </div>
        )}

        {/* Create Scan Project Dialog */}
        <CreateScanTargetDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onSuccess={fetchScanTargets}
        />
      </div>
    </div>
  );
}
