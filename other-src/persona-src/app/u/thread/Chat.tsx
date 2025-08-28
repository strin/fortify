"use client";
import Chat from "@/components/Chat";
import { Creator } from "@/types";

interface ChatComponentProps {
  creator: Creator;
}

export default function ChatComponent({ creator }: ChatComponentProps) {
  const profile = {
    userName: creator.username || "",
    profileImage: creator.Profile?.[0]?.profileImage || "",
    creatorId: creator.id,
  };
  return (
    <div className="h-full overflow-scroll bg-black pb-4">
      <Chat
        profile={profile}
        initialState={{
          question: "Hello Note.",
          summary: <div>Ask anything about your private notes here.</div>,
          followUpQuestions: [],
        }}
        chatInputOffset={100}
        privateMode={true}
        darkMode={true}
        newChatButton={true}
      />
    </div>
  );
}
