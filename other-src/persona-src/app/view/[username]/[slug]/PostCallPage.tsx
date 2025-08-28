"use client";

import React from "react";
import { Chat, Message, SessionUser } from "@/types";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, RefreshCw } from "lucide-react";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface PostCallPageProps {
  chat: Chat | null;
  username: string;
  slug: string;
}

const LoadingScreen = () => {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="flex items-center gap-2">
        <div className="animate-spin">
          <Loader2 className="h-4 w-4" />
        </div>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
};

export default function PostCallPage({
  chat,
  username,
  slug,
}: PostCallPageProps) {
  const { data: session } = useSession();
  const user = session?.user as SessionUser | null;

  if (!chat || !chat.id) {
    return <LoadingScreen />;
  }

  const [messages, setMessages] = React.useState<Message[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  const isLoggedIn = !!user;

  React.useEffect(() => {
    const fetchMessages = async () => {
      if (!chat.id) return;

      setIsLoading(true);
      try {
        const response = await fetch(`/api/chats/${chat.id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch messages");
        }
        const data = await response.json();
        setMessages(data.messages);
      } catch (error) {
        console.error("Error fetching messages:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();
  }, [chat.id]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  const restartCallButton = () => {
    return (
      <Button variant="secondary" onClick={() => window.location.reload()}>
        <RefreshCw className="mr-2 h-4 w-4" />
        Restart Call
      </Button>
    );
  };

  return (
    <div className="relative max-w-6xl mx-auto p-4 md:p-6">
      <div className="h-16" />
      {/* Top-right CTA Button */}
      <div className="absolute top-6 right-4 md:right-6 z-50 mt-8">
        {isLoggedIn ? (
          <div className="flex flex-row gap-2">
            {restartCallButton()}
            <Link href={`http://localhost:3000/u/meetings/${chat.id}`}>
              <Button variant="default" className="w-full md:w-auto">
                Open in My Library
              </Button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-row gap-2">
            {restartCallButton()}
            <Link href="/auth/signup">
              <Button variant="default" className="w-full md:w-auto">
                Sign Up to Save This Call
              </Button>
            </Link>
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-8 mt-16">
        {/* Left panel - Summary */}
        <div className="flex-1 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Title</Badge>
              <h1 className="text-2xl md:text-3xl font-bold">
                {chat.title || "Untitled Call"}
              </h1>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Summary</Badge>
              <h2 className="text-xl md:text-2xl font-semibold">
                Call Summary
              </h2>
            </div>
            <div className="bg-card rounded-lg p-4 md:p-6 min-h-[200px]">
              <MarkdownRenderer
                content={chat.summary || "No summary available"}
                className="text-card-foreground"
              />
            </div>
          </div>
        </div>

        {/* Right panel - Transcript */}
        <div className="w-full md:w-[400px] space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Transcript</Badge>
            <h2 className="text-xl md:text-2xl font-semibold">
              Call Transcript
            </h2>
          </div>
          <ScrollArea className="h-[400px] md:h-[600px] rounded-lg border">
            <div className="p-4 space-y-4">
              {messages.map((message, index) => (
                <div key={message.id || index} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        message.role === "assistant" ? "default" : "outline"
                      }
                    >
                      {message.role === "assistant" ? username : message.role}
                    </Badge>
                    {message.startTimestamp && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(message.startTimestamp)
                          .toISOString()
                          .substr(11, 8)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm pl-2 whitespace-pre-wrap">
                    {message.content}
                  </p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
