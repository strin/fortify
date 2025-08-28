"use client";

import React from "react";
import ProfileRing from "@/components/LiveCall/ProfileRing";
import { Profile, Creator, Post } from "@/types";
import { useLiveKit } from "@/components/transports/LiveKit";
import { Mixpanel } from "@/lib/mixpanel";
import { SessionUser, Chat } from "@/types";
import { indexChat } from "@/lib/content-service";
import { PostCallStatusUpdate } from "./types";

export default function LiveCallContent({
  profile,
  creator,
  post,
  user,
  onCallStatusUpdate,
  onFinishCall,
}: {
  profile: Profile;
  creator: Creator;
  post?: Post;
  user: SessionUser | null;
  onCallStatusUpdate?: (status: PostCallStatusUpdate) => void;
  onFinishCall?: (chat: Chat) => void;
}) {
  const {
    isConnecting,
    isConnected,
    connect,
    disconnect,
    callDuration,
    transcriptHistory,
    transcriptEvents,
  } = useLiveKit();

  const [hasConnected, setHasConnected] = React.useState(false);
  const [chat, setChat] = React.useState<Chat | null>(null);
  // on dev the useEffect hooks are called multiple times, so we need to make sure we only create the chat once
  const chatCreated = React.useRef(false);
  const messageListenerCreated = React.useRef(false);

  React.useEffect(() => {
    transcriptEvents.on("newChat", async (chat) => {
      console.log("LiveCall newChat", chat);
      if (!chatCreated.current) {
        chatCreated.current = true;
        const response = await fetch("/api/creators/" + creator.id + "/chat", {
          method: "POST",
          body: JSON.stringify({
            messages: [],
            userId: user?.id,
            postId: post?.id !== -1 ? post?.id : null,
          }),
        });
        const newChat = await response.json();
        setChat(newChat);
        console.log("New chat created", newChat);
      }
    });

    return () => {
      transcriptEvents.off("newChat", () => {});
      transcriptEvents.off("newUserRecording", () => {});
      transcriptEvents.off("newPersonaRecording", () => {});
    };
  }, [transcriptEvents, creator.id]);

  React.useEffect(() => {
    console.log("Chat", chat);
    transcriptEvents.on("newUserRecording", async (recording) => {
      console.log("LiveCall newUserRecording", "chatId", chat?.id, recording);
      if (recording && chat?.id) {
        onCallStatusUpdate?.(PostCallStatusUpdate.UPLOADING_AUDIO);
        const response = await fetch(
          "/api/creators/" + creator.id + "/chat/" + chat?.id + "/recording",
          {
            method: "POST",
            headers: {
              "x-recording-type": "user",
            },
            body: recording,
          }
        );
        if (response.ok) {
          const data = await response.json();
          console.log("Recording uploaded user successfully", data);
        } else {
          console.error("Failed to upload user recording");
        }

        // update chat end timestamp
        onCallStatusUpdate?.(PostCallStatusUpdate.UPLOADING_TRANSCRIPT);
        if (chat?.id) {
          await fetch(
            "/api/creators/" + creator.id + "/chat/" + chat?.id + "/close",
            { method: "POST" }
          );
        }

        // summarize chat
        onCallStatusUpdate?.(PostCallStatusUpdate.PROCESSING_SUMMARY);
        if (chat?.id) {
          const response = await fetch(
            "/api/creators/" + creator.id + "/chat/" + chat?.id + "/summarize",
            { method: "POST" }
          );
          const summaryData = await response.json();

          // index chat summary
          if (user?.id) {
            await indexChat({
              userId: user.id,
              creatorId: creator.id,
              chatId: chat.id,
              postId: post?.id !== -1 ? post?.id : null,
              summary: summaryData.summary,
              title: summaryData.title,
            });
          }

          chat.summary = summaryData.summary;
          chat.title = summaryData.title;

          onCallStatusUpdate?.(PostCallStatusUpdate.DONE);
          onFinishCall?.(chat);
          // // attach call summary to thread

          // if (user?.id) {
          //   await fetch("/api/threads/attach-call-summary", {
          //     method: "POST",
          //     headers: {
          //       "Content-Type": "application/json",
          //     },
          //     body: JSON.stringify({
          //       userId: user.id,
          //       creatorId: creator.id,
          //       chatId: chat.id,
          //     }),
          //   });
          // }
        }
      }
    });

    transcriptEvents.on("newPersonaRecording", async (recording) => {
      console.log(
        "LiveCall newPersonaRecording",
        "chatId",
        chat?.id,
        recording
      );
      if (recording && chat?.id) {
        const response = await fetch(
          "/api/creators/" + creator.id + "/chat/" + chat?.id + "/recording",
          {
            method: "POST",
            headers: {
              "x-recording-type": "assistant",
            },
            body: recording,
          }
        );
        if (response.ok) {
          const data = await response.json();
          console.log("Recording uploaded assistant successfully", data);
        } else {
          console.error("Failed to upload assistant recording");
        }
      }
    });
  }, [chat?.id]);

  React.useEffect(() => {
    if (!chat) return;
    if (messageListenerCreated.current) return;
    messageListenerCreated.current = true;

    transcriptEvents.on("newMessage", async (message) => {
      console.log("LiveCall newMessage", chat, message);
      if (chat && chat.id) {
        const response = await fetch(
          "/api/creators/" + creator.id + "/message",
          {
            method: "POST",
            body: JSON.stringify({
              content: message.content,
              role: message.role,
              chatId: chat.id,
              startTimestamp: message.startTimestamp,
              endTimestamp: message.endTimestamp,
            }),
          }
        );
        const newMessage = await response.json();
        setChat((prevChat) => ({
          ...prevChat,
          messages: [...(prevChat?.messages || []), newMessage],
        }));
      } else {
        throw new Error("Chat and Chat ID is required for saving messages");
      }
    });

    return () => {
      transcriptEvents.off("newMessage", () => {});
    };
  }, [chat, transcriptEvents]);

  React.useEffect(() => {
    if (!hasConnected && !isConnected && !isConnecting) {
      connect();
      setHasConnected(true);
    }
    console.log(hasConnected, isConnected, isConnecting, connect);
    if (isConnected && !isConnecting) {
      console.log("Call started", {
        username: creator.username,
        userId: user?.id,
        creatorId: creator.id,
        postId: post?.id,
        postTitle: post?.title,
        postSummary: post?.summary,
      });
      Mixpanel.track("Call Started", {
        username: creator.username,
        userId: user?.id,
        creatorId: creator.id,
        postId: post?.id,
        postTitle: post?.title,
        postSummary: post?.summary,
      });
    }
    if (!isConnected && !isConnecting) {
      console.log("Call Ended", {
        username: creator.username,
        userId: user?.id,
        creatorId: creator.id,
        postId: post?.id,
        postTitle: post?.title,
        postSummary: post?.summary,
        callDuration,
      });
      Mixpanel.track("Call Ended", {
        username: creator.username,
        userId: user?.id,
        creatorId: creator.id,
        postId: post?.id,
        postTitle: post?.title,
        postSummary: post?.summary,
        callDuration,
      });
    }
  }, [hasConnected, isConnected, isConnecting]);

  return (
    <div className="flex items-center justify-center">
      <ProfileRing profile={profile} />
    </div>
  );
}
