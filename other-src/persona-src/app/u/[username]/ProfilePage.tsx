"use client";

import { ProfileHeader } from "@/components/ProfileHeader";
import { Thread } from "@/types";

import { Creator, SessionUser } from "@/types";
import PhotoWallView from "@/app/u/[username]/PhotoWallView";
import { PageSlideIn, PageZoomIn } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useEffect, useState } from "react";
import CreatorHome from "./components/CreatorHome";
import Chat from "@/components/Chat";
import ThreadChat from "@/components/ThreadChat/ThreadChat";

interface IProps {
  creator: Creator;
  user?: SessionUser | null;
}

export default function ProfilePage(props: IProps) {
  const { creator, user } = props;

  const [thread, setThread] = useState<Thread | null>(null);

  console.log("creator", user);
  // Check if there's a previous URL in history
  let AnimateComponent = PageSlideIn;

  const previousPath =
    typeof window !== "undefined" &&
    sessionStorage &&
    sessionStorage.getItem("previousPath");
  if (previousPath) {
    if (previousPath.includes("/c/")) {
      AnimateComponent = PageZoomIn;
    }
  }
  useEffect(() => {
    if (sessionStorage) {
      sessionStorage.setItem("previousPath", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    const fetchThread = async () => {
      if (!user?.id || !creator.id) {
        console.error("User or creator ID is missing", user, creator);
        return;
      }
      const thread = await fetch(
        `/api/threads/by-user-creator?userId=${user?.id}&creatorId=${creator.id}`
      );
      const threadData = await thread.json();
      setThread(threadData);
      console.log("thread", threadData);
    };
    fetchThread();
  }, [creator.id, user?.id]);

  return (
    <AnimateComponent className="h-full w-full">
      <div
        className="fixed left-1/2 -translate-x-1/2 max-w-[600px] w-full h-full bg-black flex flex-col space-y-4 px-4 overflow-hidden"
        style={{ overscrollBehavior: "none", WebkitOverflowScrolling: "touch" }}
      >
        <ThreadChat userId={user?.id || 0} creatorId={creator.id} />
      </div>
    </AnimateComponent>
  );
}
