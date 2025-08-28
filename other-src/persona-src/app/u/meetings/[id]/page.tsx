"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { formatDistanceToNow, format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Clock, Users } from "lucide-react";
import { Message } from "@/types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Participant {
  id: string;
  name: string;
  email: string;
  image?: string;
}

interface Meeting {
  id: string;
  title: string;
  summary: string;
  createdAt: string;
  updatedAt: string;
  durationSecs: number; // in seconds
  startTime: string;
  endTime: string;
  participants: Participant[];
  messages: Message[];
}

export default function MeetingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [transcriptView, setTranscriptView] = useState(true);

  useEffect(() => {
    const fetchMeeting = async () => {
      try {
        // Replace with your actual API endpoint
        const response = await fetch(`/api/chats/${params.id}`);
        const data = await response.json();
        setMeeting(data);
      } catch (error) {
        console.error("Error fetching meeting details:", error);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchMeeting();
    }
  }, [params.id]);

  // Format duration from seconds to minutes and seconds
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Format timestamp from seconds to minutes:seconds format
  const formatTimestamp = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="mb-6">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to meetings
          </Button>
          <Skeleton className="h-10 w-3/4 mb-2" />
          <Skeleton className="h-6 w-1/2 mb-6" />
          <div className="flex gap-4 mb-6">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-32" />
          </div>
          <Skeleton className="h-24 w-full mb-8" />
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-1/4 mb-2" />
                <Skeleton className="h-16 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="container mx-auto py-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Meeting not found</h2>
        <Button onClick={() => router.push("/meetings")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to meetings
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Button
        variant="ghost"
        className="mb-4"
        onClick={() => router.push("/u/meetings")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to meetings
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{meeting.title}</h1>
        <div className="text-gray-500 mb-4">
          {format(new Date(meeting.startTime), "PPP")} (
          {formatDistanceToNow(new Date(meeting.startTime), {
            addSuffix: true,
          })}
          )
        </div>

        <div className="flex flex-wrap gap-4 mb-6">
          <Badge
            variant="secondary"
            className="flex items-center gap-1 px-3 py-1"
          >
            <Clock className="h-4 w-4" />
            {formatDuration(meeting.durationSecs)}
          </Badge>
          <Badge
            variant="secondary"
            className="flex items-center gap-1 px-3 py-1"
          >
            <Users className="h-4 w-4" />
            {/* {meeting.participants.length} participants */}
          </Badge>
        </div>

        <Card className="mb-8">
          <CardContent className="pt-6">
            {/* <h3 className="text-lg font-semibold mb-2">Summary</h3> */}
            <div className="text-gray-700 max-h-[150px] overflow-y-auto prose prose-sm">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  ul: ({ node, ...props }) => (
                    <ul className="list-disc list-inside" {...props} />
                  ),
                  ol: ({ node, ...props }) => (
                    <ol className="list-decimal list-inside" {...props} />
                  ),
                  h1: ({ node, ...props }) => (
                    <h1 className="text-2xl font-bold mt-4 mb-2" {...props} />
                  ),
                  h2: ({ node, ...props }) => (
                    <h2 className="text-xl font-bold mt-3 mb-2" {...props} />
                  ),
                  h3: ({ node, ...props }) => (
                    <h3 className="text-lg font-bold mt-2 mb-1" {...props} />
                  ),
                }}
              >
                {meeting.summary}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>

        {/* <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4">Participants</h3>
          <div className="flex flex-wrap gap-3">
            {meeting.participants.map((participant) => (
              <div
                key={participant.id}
                className="flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1"
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage src={participant.image} alt={participant.name} />
                  <AvatarFallback className="text-xs">
                    {participant.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm">{participant.name}</span>
              </div>
            ))}
          </div>
        </div>*/}
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Conversation</h3>
          <div className="flex items-center space-x-2">
            <Button
              variant={transcriptView ? "default" : "outline"}
              size="sm"
              onClick={() => setTranscriptView(true)}
            >
              Transcript
            </Button>
            <Button
              variant={!transcriptView ? "default" : "outline"}
              size="sm"
              onClick={() => setTranscriptView(false)}
            >
              Chat
            </Button>
          </div>
        </div>

        {transcriptView ? (
          <div className="space-y-6 rounded-lg p-6 max-h-[600px] overflow-y-auto">
            {meeting.messages.map((message) => (
              <div key={message.id} className="flex gap-4">
                {message.startTimestamp !== undefined && (
                  <div className="w-16 flex-shrink-0 text-gray-500 text-sm font-mono">
                    {formatTimestamp(message.startTimestamp)}
                  </div>
                )}
                {/* <Avatar className="flex-shrink-0">
                  <AvatarImage
                    src={message.sender.image}
                    alt={message.sender.name}
                  />
                  <AvatarFallback>
                    {message.sender.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar> */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{message.role}</span>
                  </div>
                  <div className="prose prose-sm max-w-none">
                    {message.content}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6 max-h-[600px] overflow-y-auto">
            {meeting.messages.map((message) => (
              <div key={message.id} className="flex gap-4">
                {/* <Avatar>
                  <AvatarImage
                    src={message.sender.image}
                    alt={message.sender.name}
                  />
                  <AvatarFallback>
                    {message.sender.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar> */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{message.role}</span>
                    <span className="text-xs text-gray-500">
                      {message.startTimestamp &&
                        format(new Date(message.startTimestamp), "p")}
                    </span>
                  </div>
                  <div className="prose prose-sm max-w-none">
                    {message.content}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
