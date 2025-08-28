"use client";

import React from "react";
import MessageHeader from "../../components/MessageHeader";
import IndividualMessages from "./IndividualMessages";
import { Thread as ThreadType } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SendIcon } from "lucide-react";
import { ThreadTextMessage, ThreadCallMessage } from "@/types";

interface ThreadProps {
  id: number;
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
  threadId: number,
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

export default function Thread({ id }: ThreadProps) {
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
    setIsLoading(true);

    const fetchThread = async () => {
      try {
        const response = await fetch(`/api/threads/${id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch thread");
        }
        const thread = await response.json();

        setThread(thread);
        setTextMessages(thread.threadTextMessages || []);
        setCallMessages(thread.threadCallMessages || []);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching thread:", error);
      }
    };

    fetchThread();
  }, [id]);

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
        const response = await fetch(`/api/threads/${id}/messages`, {
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
        thread?.user.id,
        thread?.creator.id,
        id,
        textMessages,
        callMessages
      );

      for (const response of responses) {
        const messageResponse = await fetch(`/api/threads/${id}/messages`, {
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

  return (
    <div className="flex flex-col h-full">
      <MessageHeader
        username={thread?.creator.username || ""}
        displayName={thread?.creator.display_name || ""}
        profilePicUrl={
          thread?.creator.Profile?.[0]?.profileImage ||
          "/default-profile-image.jpg"
        }
        loading={isLoading}
      />
      <IndividualMessages
        textMessages={textMessages}
        callMessages={thread?.threadCallMessages || []}
        isGenerating={isGenerating}
        isTyping={isTyping}
      />
      <div className="fixed bottom-0 left-0 right-0 bg-[#1E1E1E] p-4 border-t border-[#2D2D2D]">
        <div className="max-w-4xl mx-auto flex gap-2 flex-row">
          <div className="flex-1">
            <Input
              type="text"
              value={inputMessage}
              onFocus={() => setIsTyping(true)}
              onBlur={() => setIsTyping(false)}
              onChange={(e) => setInputMessage(e.target.value)}
              className="touch-manipulation focus:ring-0 focus:outline-none w-full h-10 rounded-md border border-[#2D2D2D] bg-[#1E1E1E] text-white px-3 py-2 text-base ring-offset-[#1E1E1E] file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 selection:bg-transparent"
              placeholder="Type a message..."
              onKeyDown={handleKeyPress}
            />
          </div>
          <Button
            disabled={!inputMessage.trim()}
            className="shrink-0 inline-flex items-center justify-center rounded-md text-md font-medium ring-offset-[#1E1E1E] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1AABF4] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-[#1AABF4] text-white hover:bg-[#1AABF4]/90 h-10 w-10 px-2 py-2"
            onClick={sendMessage}
          >
            <SendIcon className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
