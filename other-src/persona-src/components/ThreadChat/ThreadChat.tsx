"use client";

import React from "react";
import TitleBar from "./TitleBar";
import IndividualMessages from "./IndividualMessages";
import { Thread as ThreadType } from "@/types";
import { ThreadTextMessage, ThreadCallMessage } from "@/types";
import { useRouter } from "next/navigation";
import ChatInput from "../ChatInput";
import ProfileHeader from "../ProfileHeader/ProfileHeader";
import ConversationStarter from "./ConversationStarter";

interface ThreadChatProps {
  userId: number;
  creatorId: number;
}

const packThreadMessages = (
  textMessages: ThreadTextMessage[],
  callMessages: ThreadCallMessage[],
  maxTokens: number = 4000
) => {
  // Merge messages while adding type to each message.
  const combinedMessages = [
    ...textMessages.map((msg) => ({
      content: msg.content,
      role: msg.role,
      createdAt: new Date(msg.createdAt),
    })),
    ...callMessages.map((msg) => ({
      content: `We had a call of duration ${msg.chat.durationSecs} seconds.\n${msg.chat.summary || ""}]`,
      role: "assistant",
      createdAt: new Date(msg.createdAt),
    })),
  ].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  // Rough token estimation - average 4 chars per token
  const estimateTokens = (text: string) => Math.ceil(text.length / 4);

  let tokenCount = 0;
  const messages = [];

  // Process messages from most recent to oldest
  for (let i = combinedMessages.length - 1; i >= 0; i--) {
    const msg = combinedMessages[i];
    const msgTokens = estimateTokens(msg.content);

    // Add message if it fits within token budget
    if (tokenCount + msgTokens <= maxTokens) {
      // unshift adds an element to the beginning of the array
      messages.unshift({
        content: msg.content,
        role: msg.role,
      });
      tokenCount += msgTokens;
    } else {
      break;
    }
  }

  console.log("packed number of messages", messages.length);

  return messages;
};

const generateCreatorResponses = async (
  userId: number,
  creatorId: number,
  textMessages: ThreadTextMessage[],
  callMessages: ThreadCallMessage[]
) => {
  // Convert thread messages to the format expected by chat API
  const messages = packThreadMessages(textMessages, callMessages);

  try {
    const response = await fetch(
      `/api/chat-agent/openai-compatible/users/${userId}/creators/${creatorId}/posts/-1/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": process.env.NEXT_PUBLIC_API_KEY!,
        },
        body: JSON.stringify({
          messages: messages,
          model: "gpt-4o",
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No reader available");
    }

    let generatedResponses: string[] = [];
    let currentResponse = "";
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;
      const text = new TextDecoder().decode(value);
      buffer += text;
    }
    const lines = buffer.split("\n\n");
    for (const line of lines) {
      if (line.trim() === "") continue;
      if (line.startsWith("data:")) {
        const data = JSON.parse(line.split("data:")[1]);
        if (data["choices"] && data["choices"].length > 0) {
          currentResponse += data["choices"][0]["delta"]["content"] || "";
          while (currentResponse.includes("\n\n")) {
            const [firstChunk, ...rest] = currentResponse.split("\n\n");
            if (firstChunk.trim() !== "") {
              generatedResponses.push(firstChunk.trim());
            }
            currentResponse = rest.join("\n\n");
          }
        }
      }
    }

    if (currentResponse.trim() !== "") {
      generatedResponses.push(currentResponse.trim());
    }

    return generatedResponses;
  } catch (error) {
    console.error("Error generating response:", error);
    return "Sorry, there was an error generating a response.";
  }
};

export default function Thread(props: ThreadChatProps) {
  const [thread, setThread] = React.useState<ThreadType | null>(null);
  const [inputMessage, setInputMessage] = React.useState("");
  const [textMessages, setTextMessages] = React.useState<ThreadTextMessage[]>(
    []
  );
  const [callMessages, setCallMessages] = React.useState<ThreadCallMessage[]>(
    []
  );
  const [isSending, setIsSending] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [isTyping, setIsTyping] = React.useState(false);

  React.useEffect(() => {
    const createNewThreadOnLoad = async () => {
      setIsLoading(true);
      await createNewThread();
      setIsLoading(false);
    };

    createNewThreadOnLoad();

    // const fetchThread = async () => {
    //   try {
    //     const response = await fetch(`/api/threads/${id}`);
    //     if (!response.ok) {
    //       throw new Error("Failed to fetch thread");
    //     }
    //     const thread = await response.json();

    //     setThread(thread);
    //     setTextMessages(thread.threadTextMessages || []);
    //     setCallMessages(thread.threadCallMessages || []);
    //     setIsLoading(false);
    //   } catch (error) {
    //     console.error("Error fetching thread:", error);
    //   }
    // };

    // fetchThread();
  }, []);

  React.useEffect(() => {
    if (sessionStorage) {
      sessionStorage.setItem("previousPath", window.location.pathname);
    }
  }, []);

  const sendMessage = async () => {
    console.log("thread send message inputMessage", inputMessage, textMessages);
    setTextMessages((prevMessages) => [
      ...prevMessages,
      {
        content: inputMessage,
        id: -1,
        type: "text",
        createdAt: new Date(),
        updatedAt: new Date(),
        role: "user",
      },
    ]);
    setIsSending(true);
  };

  const createNewThread = async () => {
    const response = await fetch(`/api/threads`, {
      method: "POST",
      body: JSON.stringify({
        userId: props.userId,
        creatorId: props.creatorId,
      }),
    });

    if (response.ok) {
      const newThread = await response.json();
      setTextMessages([]);
      setCallMessages([]);
      setThread(newThread);
      setInputMessage("");
    }
  };

  React.useEffect(() => {
    if (inputMessage.trim() === "") {
      setIsTyping(false);
    } else {
      setIsTyping(true);
    }
  }, [inputMessage]);

  React.useEffect(() => {
    if (!isSending) return;

    const updateThread = async () => {
      console.log("thread send message textMessages", textMessages);
      try {
        const response = await fetch(`/api/threads/${thread?.id}/messages`, {
          method: "POST",
          body: JSON.stringify({ message: inputMessage, role: "user" }),
        });

        if (response.ok) {
          setInputMessage("");
          const updatedThread = await response.json();
          setTextMessages(updatedThread.threadTextMessages);
        } else {
          throw new Error("Failed to send message");
        }
      } catch (error) {
        console.error("Error sending message:", error);
        // Remove the optimistically added message
        setTextMessages(textMessages.slice(0, -1));
      }
      setIsSending(false);
    };

    const makeResponse = async () => {
      setIsGenerating(true);

      if (!thread?.creator.id) {
        console.error("Thread creator ID not found");
        return;
      }

      const responses = await generateCreatorResponses(
        props.userId,
        props.creatorId,
        textMessages,
        callMessages
      );

      for (const response of responses) {
        const messageResponse = await fetch(`/api/threads/${thread?.id}/messages`, {
          method: "POST",
          body: JSON.stringify({ message: response, role: "assistant" }),
        });

        if (messageResponse.ok) {
          setInputMessage("");
          const updatedThread = await messageResponse.json();
          setTextMessages(updatedThread.threadTextMessages);
        }
      }

      setIsGenerating(false);
    };

    updateThread();
    makeResponse();
  }, [isSending]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputMessage.trim()) {
      sendMessage();
    }
  };

  const router = useRouter();

  const isConversationStarting = textMessages.length === 0 && callMessages.length === 0;

  const renderTitleBar = () => {
    return (
      <TitleBar
        username={thread?.creator.username || ""}
        displayName={thread?.creator.display_name || ""}
        profilePicUrl={
          thread?.creator.Profile?.[0]?.profileImage ||
          "/default-profile-image.jpg"
        }
        loading={isLoading}
        onStartCall={() => {
          console.log("start call");
          router.push(`/c/${thread?.creator.username}/-1`);
        }}
        onNewChat={async () => {
          console.log("new chat");
          await createNewThread();
        }}
      />
    )
  }

  const renderConversationStarter = () => {
    if (!thread?.creator || !thread?.user) {
      return null;
    }
    return (
      <div className="flex flex-col gap-4">
        <ProfileHeader creator={thread?.creator} showSocialMedia={false} />
        <ConversationStarter creator={thread?.creator} />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {!isConversationStarting ? renderTitleBar() : renderConversationStarter()}

      <IndividualMessages
        textMessages={textMessages}
        callMessages={thread?.threadCallMessages || []}
        isGenerating={isGenerating}
        isTyping={isTyping}
      />
      <div
        className={`fixed left-5 right-5 z-50 shadow-lg backdrop-blur-sm max-w-[600px] mx-auto`}
        style={{ bottom: `20px` }}
      >
        <ChatInput
          darkMode={false}
          isDisabled={isGenerating}
          onSubmit={(message: string) => {
            setInputMessage(message);
            sendMessage();
          }}
        />
      </div>
    </div>
  );
}
