"use client";

import React, { useEffect, useState } from "react";
import LiveCall from "@/components/LiveCall/LiveCall";
import { Post, Creator, Chat } from "@/types";
import { AnimatePresence } from "framer-motion";
import { SessionUser } from "@/types";
import HeaderNavigation from "@/app/c/components/HeaderNavigation";
import { useSession } from "next-auth/react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { X, Loader2 } from "lucide-react";
import { PostCallStatusUpdate } from "@/components/LiveCall/types";

interface LivePageProps {
  username: string;
  guestDisplayName: string | null;
  slug: string;
  onFinishCall?: (chat: Chat) => void;
}

export default function LivePage({
  username,
  guestDisplayName,
  slug,
  onFinishCall,
}: LivePageProps) {
  const { data: session } = useSession();
  const user = session?.user as SessionUser | null;

  const [isLoading, setIsLoading] = useState(true);
  const [post, setPost] = useState<Post | null>(null);
  const [creator, setCreator] = useState<Creator | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [callStatus, setCallStatus] = useState<string | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Fetch post data
        let postData = {
          id: -1,
          title: "Default Post",
          overview: "This is the default post",
          promptId: -1,
        } as Post;
        if (slug !== "-1") {
          // Fetch clone and post data
          const cloneResponse = await fetch(`/api/clones/by-slug/${slug}`);
          if (!cloneResponse.ok) {
            throw new Error("Failed to fetch clone");
          }
          const cloneData = await cloneResponse.json();

          if (cloneData.postId) {
            const postResponse = await fetch(`/api/posts/${cloneData.postId}`);
            if (!postResponse.ok) {
              throw new Error("Failed to fetch post");
            }
            postData = await postResponse.json();
          }
        }
        setPost(postData);

        // Fetch profile data
        const creatorResponse = await fetch(
          `/api/creators/by-username/${username}`
        );
        if (!creatorResponse.ok) {
          throw new Error("Failed to fetch profile");
        }
        const creatorData = await creatorResponse.json();

        setUserProfile(creatorData.creator.Profile[0]);
        setCreator({
          id: creatorData.creator.id,
          username: creatorData.creator.username,
          display_name: creatorData.creator.display_name,
          email: creatorData.creator.email,
          image: creatorData.creator.Profile[0].profileImage,
        } as Creator);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(
          err instanceof Error ? err.message : "An unknown error occurred"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [slug, username]);

  // Show banner whenever call status changes
  useEffect(() => {
    if (callStatus) {
      setShowBanner(true);
      // Auto-hide banner after 5 seconds
      const timer = setTimeout(() => setShowBanner(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [callStatus]);

  const getStatusMessage = (status: string): string => {
    if (status.includes("error")) return status;

    switch (status) {
      case PostCallStatusUpdate.PROCESSING_SUMMARY:
        return "Processing call summary... Please do not close this window.";
      case PostCallStatusUpdate.UPLOADING_TRANSCRIPT:
        return "Uploading transcript... Please do not close this window.";
      case PostCallStatusUpdate.UPLOADING_AUDIO:
        return "Uploading audio recording... Please do not close this window.";
      case PostCallStatusUpdate.DONE:
        return "Call processing completed!";
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        Error: {error}
      </div>
    );
  }

  if (!post || !creator || !userProfile) {
    return (
      <div className="flex items-center justify-center h-screen">
        Required data not found
      </div>
    );
  }

  return (
    <div className="bg-background h-full w-full max-w-6xl flex flex-col justify-center items-center relative">
      {/* Call Status Banner */}
      {showBanner && callStatus && (
        <div className="fixed top-4 right-4 z-50 max-w-xs">
          <Alert className="border border-border bg-background/95 backdrop-blur-sm shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    callStatus.includes("error") ? "destructive" : "default"
                  }
                >
                  {callStatus.includes("error") ? "Error" : "Status"}
                </Badge>
                <AlertDescription className="flex items-center gap-2">
                  {callStatus !== PostCallStatusUpdate.DONE &&
                    !callStatus.includes("error") && (
                      <Loader2 size={14} className="animate-spin" />
                    )}
                  {getStatusMessage(callStatus)}
                </AlertDescription>
              </div>
              <button
                onClick={() => setShowBanner(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>
          </Alert>
        </div>
      )}

      {/* <HeaderNavigation /> */}
      <AnimatePresence mode="wait">
        <LiveCall
          profile={userProfile}
          post={post}
          creator={creator}
          user={user}
          guestDisplayName={guestDisplayName}
          onCallStatusUpdate={setCallStatus}
          onFinishCall={onFinishCall}
          disableCallButton={
            !!(
              showBanner &&
              callStatus &&
              callStatus !== PostCallStatusUpdate.DONE
            )
          }
        />
      </AnimatePresence>
    </div>
  );
}
