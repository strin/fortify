"use client";

import { useState } from "react";
import LivePage from "./LiveCallPage";
import WaitingPage from "./WaitingCallPage";
import { Chat, SessionUser } from "@/types";
import PostCallPage from "./PostCallPage";
import { useSession } from "next-auth/react";

enum CallState {
  LIVE = "LIVE",
  WAITING = "WAITING",
  FINISHED = "FINISHED",
}

export default function CallPage(props: {
  params: { username: string; slug: string };
}) {
  const [callState, setCallState] = useState<CallState>(CallState.WAITING);
  const [chat, setChat] = useState<Chat | null>(null);

  const { data: session } = useSession();
  const user = session?.user as SessionUser | null;

  const [guestDisplayName, setGuestDisplayName] = useState<string | null>(
    user ? user.name : null
  );

  const handleJoin = (guestDisplayName?: string) => {
    setCallState(CallState.LIVE);
    setGuestDisplayName(guestDisplayName || null);
  };

  const handleFinishCall = (chat: Chat) => {
    setCallState(CallState.FINISHED);
    setChat(chat);
  };

  if (callState === CallState.LIVE) {
    return (
      <LivePage
        username={props.params.username}
        slug={props.params.slug}
        onFinishCall={handleFinishCall}
        guestDisplayName={guestDisplayName}
      />
    );
  } else if (callState === CallState.WAITING) {
    return (
      <WaitingPage
        onJoin={handleJoin}
        username={props.params.username}
        slug={props.params.slug}
      />
    );
  } else {
    return (
      <PostCallPage
        chat={chat}
        username={props.params.username}
        slug={props.params.slug}
      />
    );
  }
}
