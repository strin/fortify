"use client";
import React, { useState, useRef, useEffect } from "react";
import { ProfileType } from "@/types";
import ChatInput from "@/components/ChatInput";
import FollowUpQuestions from "@/components/FollowUpQuestions";
import { FollowUpQuestion } from "@/components/FollowUpQuestions/FollowUpQuestions";
import { Mixpanel } from "@/lib/mixpanel";
import { Message } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import ReactDOMServer from "react-dom/server";

import ReactMarkdown from "react-markdown";
// Add these imports
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

import { ReactNode } from "react";
import ThumbsFeedback from "../ThumbsFeedback";

const customComponents: Record<string, React.FC<{ children: ReactNode }>> = {
  p: ({ children }: { children: React.ReactNode }) => (
    <p className="mb-4">{children}</p>
  ),
  ul: ({ children }: { children: React.ReactNode }) => (
    <ul className="list-disc pl-5 mb-4">{children}</ul>
  ),
  ol: ({ children }: { children: React.ReactNode }) => (
    <ol className="list-decimal pl-5 mb-4">{children}</ol>
  ),
  li: ({ children }: { children: React.ReactNode }) => (
    <li className="mb-2">
      {React.Children.map(children, (child) => {
        if (
          React.isValidElement(child) &&
          (child.type === "ul" || child.type === "ol")
        ) {
          return <div className="mt-2">{child}</div>;
        }
        return child;
      })}
    </li>
  ),
};

interface ChatProps {
  profile: ProfileType;
  initialState: {
    question: string;
    summary: React.ReactNode;
    followUpQuestions: FollowUpQuestion[];
  };
  chatInputOffset?: number;
  privateMode?: boolean;
  darkMode?: boolean;
  newChatButton?: boolean;
  personaApp?: boolean;
}

const Chat = (props: ChatProps) => {
  const { profile } = props;
  const { initialState } = props;
  const [question, setQuestion] = useState<string>("");
  const [answer, setAnswer] = useState<string>("");
  const [followUpQuestions, setFollowUpQuestions] = useState<
    FollowUpQuestion[]
  >(initialState.followUpQuestions || []);
  const [isLoadingFollowUpQuestions, setIsLoadingFollowUpQuestions] =
    useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const initialMessages = [
    { content: initialState.question, role: "user" },
    {
      content: ReactDOMServer.renderToString(initialState.summary),
      role: "assistant",
    },
  ] as Message[];

  const [messages, setMessages] = useState<Message[]>(initialMessages);

  const updateChatContext = (question: string, answer: string) => {
    setMessages((messages) => [
      ...messages,
      { content: question, role: "user" },
    ]);
    setMessages((messages) => [
      ...messages,
      { content: answer, role: "assistant" },
    ]);
    setQuestion("");
    setAnswer("");
  };

  const handleChatSubmit = async (question: string) => {
    setIsLoading(true);
    setIsStarted(true);
    setAnswer("");
    setQuestion(question);

    try {
      const response = await fetch("/api/chat-agent/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": process.env.NEXT_PUBLIC_API_KEY!,
        },
        body: JSON.stringify({
          question,
          messages: messages,
          creatorId: profile.creatorId,
          private: props.privateMode ? "true" : "false",
        }),
      });

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No reader available");
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = new TextDecoder().decode(value);
        setAnswer((prev) => prev + text);
      }
    } catch (error) {
      console.error("Error submitting chat:", error);
      setAnswer("Sorry, there was an error generating a response.");
    }

    setIsLoading(false);
  };

  useEffect(() => {
    if (!isLoading && answer) {
      Mixpanel.track("Chat", {
        creatorId: profile.creatorId,
        userId: profile.creatorId,
        app: props.personaApp ? "persona" : "chat",
        private: props.privateMode ? "true" : "false",
        darkMode: props.darkMode ? "true" : "false",
        question: question,
        answer: answer,
      });
      updateChatContext(question, answer);
      fetchFollowUpQuestions(question, answer);
    }
  }, [isLoading]);

  const fetchFollowUpQuestions = async (question: string, answer: string) => {
    setIsLoadingFollowUpQuestions(true);
    const response = await fetch("/api/chat-agent/follow-up", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": process.env.NEXT_PUBLIC_API_KEY!,
      },
      body: JSON.stringify({ question, answer }),
    });
    const data = await response.json();
    if (data && data.followUpQuestions.length > 0) {
      const followUpQuestions = data.followUpQuestions.map((row: any) => ({
        question: row.question,
        displayText: row.question,
      }));
      setFollowUpQuestions(followUpQuestions);
      Mixpanel.track("FollowUpQuestions", {
        question,
        answer,
        followUpQuestions,
      });
    }
    setIsLoadingFollowUpQuestions(false);
  };

  const runQuestion = (q: string) => {
    setQuestion(q);
    handleChatSubmit(q);
    setIsStarted(true);
  };

  const renderQuestion = (question: React.ReactNode, key: string) => {
    return (
      <div
        className={`${props.darkMode ? "text-white" : "text-gray-800"} hover:text-gray-600 font-semibold block text-2xl mb-4 text-left`}
        key={key}
      >
        {question}
      </div>
    );
  };

  const renderAnswer = (answer: string, key: string) => {
    if (!isStarted) {
      return initialState.summary;
    } else {
      return (
        <div
          className={`${props.darkMode ? "text-white" : "text-gray-800"} block mb-4`}
          key={key}
        >
          <ReactMarkdown
            components={customComponents}
            rehypePlugins={[rehypeRaw]}
            remarkPlugins={[remarkGfm]}
          >
            {answer}
          </ReactMarkdown>
        </div>
      );
    }
  };
  console.log(messages);

  const handleNewChat = () => {
    setMessages(initialMessages);
    setQuestion("");
    setAnswer("");
    setFollowUpQuestions([]);
    setIsStarted(false);
  };

  return (
    <div className="px-4">
      {props.newChatButton && (
        <div className="flex justify-end mb-4">
          <button
            onClick={handleNewChat}
            className={`p-2 rounded-full hover:bg-gray-100 ${
              props.darkMode ? "text-white hover:bg-gray-800" : "text-gray-800"
            }`}
            aria-label="New Chat"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
          </button>
        </div>
      )}

      <div className={`pb-24 flex flex-col flex-grow`}>
        {messages.slice(0, -1).map((message, index) => {
          if (message.role === "user") {
            const question = message.content;
            const answer = messages[index + 1].content;
            return (
              <>
                {renderQuestion(question, `msg-${index}-question`)}
                {renderAnswer(answer, `msg-${index}-answer`)}
              </>
            );
          }
        })}
        {question &&
          question.length > 0 &&
          renderQuestion(question, "new-question")}
        {answer && answer.length > 0 && renderAnswer(answer, "new-answer")}
        {!isLoading && (
          <ThumbsFeedback
            question={ReactDOMServer.renderToString(question)}
            answer={ReactDOMServer.renderToString(answer)}
          />
        )}
        {isLoadingFollowUpQuestions ? (
          <div className="space-y-2">
            <Skeleton className="h-4 md:w-[400px] w-full" />
            <Skeleton className="h-4 md:w-[400px] w-full" />
            <Skeleton className="h-4 md:w-[400px] w-full" />
          </div>
        ) : (
          !isLoading &&
          followUpQuestions.length > 0 && (
            <div className="mb-4">
              <FollowUpQuestions
                darkMode={props.darkMode}
                title="Ask me..."
                runQuestion={runQuestion}
                followUpQuestions={followUpQuestions}
              />
            </div>
          )
        )}
      </div>

      <div
        className={`fixed left-5 right-5 z-50 shadow-lg backdrop-blur-sm max-w-[600px] mx-auto ${
          props.darkMode ? "bg-gray-900" : ""
        }`}
        style={{ bottom: `${props.chatInputOffset || 20}px` }}
      >
        <ChatInput
          darkMode={props.darkMode}
          isDisabled={isLoading}
          onSubmit={(q: string) => handleChatSubmit(q)}
        />
      </div>
    </div>
  );
};

export default Chat;
