"use client";

import { useState, useEffect } from "react";
import { Creator } from "@/types";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

interface Meeting {
  id: string;
  title: string;
  duration: number;
  createdAt: string;
  summary: string;
}

interface Clone {
  id: number;
  name: string;
  slug: string;
}

interface CloneMeetingsViewProps {
  creator: Creator;
  cloneSlug: string;
}

export default function CloneMeetingsView({
  creator,
  cloneSlug,
}: CloneMeetingsViewProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [clone, setClone] = useState<Clone | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);

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

        // In a real app, you would fetch actual meetings
        // This is just placeholder data
        const mockMeetings = Array(5)
          .fill(null)
          .map((_, i) => ({
            id: `meeting-${i + 1}`,
            title: `Meeting ${i + 1}`,
            duration: Math.floor(Math.random() * 60) * 60, // in seconds
            createdAt: new Date(
              Date.now() - i * 24 * 60 * 60 * 1000
            ).toISOString(),
            summary: "This is a sample meeting summary.",
          }));

        setMeetings(mockMeetings);
      } catch (error) {
        console.error("Error fetching clone:", error);
        toast.error("Failed to load clone data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchClone();
  }, [cloneSlug]);

  // Helper function to format duration from seconds to human-readable format
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p>Loading meetings data...</p>
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

  return (
    <>
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Meetings with this Clone</h2>

        {meetings.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-xl font-medium text-gray-600">
              No meetings found
            </h3>
            <p className="text-gray-500 mt-2">
              Meetings with this clone will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {meetings.map((meeting) => (
              <Link
                href={`/u/meetings/${meeting.id}`}
                key={meeting.id}
                className="block"
              >
                <Card className="w-full overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-xl">{meeting.title}</CardTitle>
                      <Badge variant="outline">
                        {formatDuration(meeting.duration)}
                      </Badge>
                    </div>
                    <CardDescription>
                      {formatDistanceToNow(new Date(meeting.createdAt), {
                        addSuffix: true,
                      })}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
