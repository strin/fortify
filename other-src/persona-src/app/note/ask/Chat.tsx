"use client";
import Chat from "@/components/Chat";

export default function ChatComponent() {
  const profile = {
    userName: "timshi",
    profileImage: "",
    creatorId: 3,
  };
  return (
    <Chat
      profile={profile}
      initialState={{
        question: "Hello Note.",
        summary: <div>Ask anything about your note here.</div>,
        followUpQuestions: [],
      }}
      chatInputOffset={100}
      privateMode={true}
      personaApp={true}
    />
  );
}
