"use client";

import { useState, useEffect } from "react";
import { Creator } from "@/types";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BarChart, Calendar, Link, Users } from "lucide-react";

interface Clone {
  id: number;
  name: string;
  excpetedDurationMs: number;
  slug: string;
  postId: number | null;
  createdAt: string;
  updatedAt: string;
}

interface CloneDashboardViewProps {
  creator: Creator;
  cloneSlug: string;
}

export default function CloneDashboardView({
  creator,
  cloneSlug,
}: CloneDashboardViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [clone, setClone] = useState<Clone | null>(null);
  const [stats, setStats] = useState({
    totalMeetings: 0,
    totalDuration: 0,
    averageDuration: 0,
    lastMeeting: null as string | null,
  });

  // Fetch clone data
  useEffect(() => {
    const fetchClone = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/clones/by-slug/${cloneSlug}`);

        if (!response.ok) {
          throw new Error("Failed to fetch clone");
        }

        const data = await response.json();
        setClone(data);

        // In a real app, you would fetch actual stats
        // This is just placeholder data
        setStats({
          totalMeetings: Math.floor(Math.random() * 20),
          totalDuration: Math.floor(Math.random() * 1000) * 60, // in seconds
          averageDuration: Math.floor(Math.random() * 30) * 60, // in seconds
          lastMeeting: new Date(
            Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
          ).toISOString(),
        });
      } catch (error) {
        console.error("Error fetching clone:", error);
        toast.error("Failed to load clone data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchClone();
  }, [cloneSlug]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p>Loading dashboard data...</p>
      </div>
    );
  }

  if (!clone) {
    return (
      <div className="flex justify-center items-center h-64">
        <p>Clone not found</p>
      </div>
    );
  }

  // Helper function to format duration from seconds to human-readable format
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="h-full overflow-y-auto pb-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Meetings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Calendar className="h-4 w-4 text-muted-foreground mr-2" />
              <div className="text-2xl font-bold">{stats.totalMeetings}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Users className="h-4 w-4 text-muted-foreground mr-2" />
              <div className="text-2xl font-bold">
                {formatDuration(stats.totalDuration)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Last Meeting</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Link className="h-4 w-4 text-muted-foreground mr-2" />
              <div className="text-2xl font-bold">
                {formatDate(stats.lastMeeting)}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Clone Overview</CardTitle>
          <CardDescription>Key information about your clone</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-1">Name</h3>
              <p>{clone.name}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium mb-1">Expected Duration</h3>
              <p>{formatDuration(clone.excpetedDurationMs / 1000)}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium mb-1">Created</h3>
              <p>{new Date(clone.createdAt).toLocaleDateString()}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium mb-1">Share URL</h3>
              <p className="text-sm text-muted-foreground break-all">
                {`${window.location.origin}/c/${creator.username}/${clone.slug}`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usage Statistics</CardTitle>
          <CardDescription>How your clone is being used</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            <BarChart className="h-8 w-8 mr-2" />
            <span>Statistics visualization would go here</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
