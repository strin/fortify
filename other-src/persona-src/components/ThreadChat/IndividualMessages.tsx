"use client";

import React, { useEffect, useRef } from "react";
import { Phone } from "lucide-react";
import { ThreadTextMessage, ThreadCallMessage } from "@/types";
import { formatDuration, formatMessageDateSection } from "@/app/u/thread/utils";

interface IndividualMessagesProps {
  textMessages: ThreadTextMessage[];
  callMessages: ThreadCallMessage[];
  isGenerating: boolean;
  isTyping: boolean;
}

const IndividualMessages = React.memo(function IndividualMessages({
  textMessages,
  callMessages,
  isGenerating = false,
  isTyping = false,
}: IndividualMessagesProps) {
  const messageEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [textMessages, callMessages, isGenerating, isTyping]);

  const messages = [
    ...textMessages.map((m) => ({
      ...m,
      type: "text",
    })),
    ...callMessages.map((m) => ({
      ...m,
      type: "call",
    })),
  ].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  const messagesWithDate = messages.reduce(
    (acc: { [key: string]: any[] }, message) => {
      const date = new Date(message.createdAt).toLocaleDateString();

      if (!acc[date]) {
        acc[date] = [];
      }

      acc[date].push(message);
      return acc;
    },
    {}
  );

  const renderTextMessage = (message: ThreadTextMessage) => {
    return (
      <div className="flex items-center gap-2 text-md font-normal">
        <p>{message.content}</p>
      </div>
    );
  };

  const renderCallMessage = (message: ThreadCallMessage) => {
    return (
      <div className="flex items-center gap-2 text-xs font-medium">
        <Phone size={20} color="#1AABF4" strokeWidth={3} />
        <p>Call Duration: {formatDuration(message.chat.durationSecs)}</p>
      </div>
    );
  };

  return (
    <ul className="flex flex-col space-y-3 overflow-y-auto px-3 pt-3 h-full max-h-screen scrollbar-hide">
      {Object.entries(messagesWithDate).map(([date, messages]) => (
        <div key={date} className="flex flex-col gap-2 p-3">
          <h2 className="self-center text-xs text-center rounded-lg bg-[#646464] text-white-blackAndWhite-white p-2 ">
            {formatMessageDateSection(date)}
          </h2>
          {messages.map((message: ThreadTextMessage | ThreadCallMessage) => (
            <div
              className={`flex ${message.type === "text" && message.role === "user" ? "justify-end" : "justify-start"}`}
              key={message.id}
            >
              <div
                className={`min-w-1.5 flex flex-col justify-start px-4 py-3 h-4 max-h-24 min-h-fit ${message.type === "text" && message.role === "user" ? "bg-[#D9D9D9] text-black-900 rounded-l-lg rounded-br-lg" : "bg-[#2D2D2D] text-white-blackAndWhite-white rounded-r-lg rounded-bl-lg"}`}
              >
                {message.type === "text"
                  ? renderTextMessage(message)
                  : renderCallMessage(message)}
              </div>
            </div>
          ))}
        </div>
      ))}
      {isGenerating && (
        <div className="flex items-center gap-1 px-4 py-4 text-gray-400 w-16">
          <div
            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
            style={{ animationDelay: "0ms" }}
          />
          <div
            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
            style={{ animationDelay: "150ms" }}
          />
          <div
            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
            style={{ animationDelay: "300ms" }}
          />
        </div>
      )}
      <div ref={messageEndRef} />
    </ul>
  );
});

export default IndividualMessages;
