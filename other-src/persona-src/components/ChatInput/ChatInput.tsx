"use client";

import React, { useState, useEffect } from "react";

interface ChatInputProps {
  onSubmit: (question: string) => void;
  onClear?: () => void;
  question?: string;
  isDisabled?: boolean;
  darkMode?: boolean;
}

const ChatInput = ({
  onSubmit,
  onClear,
  question: propQuestion,
  isDisabled,
  darkMode,
}: ChatInputProps) => {
  const [question, setQuestion] = useState(propQuestion);
  const darkModeClass = darkMode ? "dark bg-gray-900" : "";

  useEffect(() => {
    setQuestion(propQuestion);
  }, [propQuestion]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (question) {
      onSubmit(question);
      setQuestion("");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div
        className={`max-w-3xl mx-auto flex items-stretch shadow-sm ${darkModeClass}`}
      >
        <input
          type="text"
          placeholder="Ask me anything"
          className={`flex-grow p-2 border border-gray-300 rounded-l-md focus:outline-none ${
            darkMode
              ? "bg-gray-800 text-white border-gray-600 placeholder-gray-400"
              : "bg-white text-gray-900"
          }`}
          value={question}
          disabled={isDisabled}
          onChange={(e) => {
            setQuestion(e.target.value);
            if (e.target.value.length === 0) {
              onClear && onClear();
            }
          }}
        />
        <button
          className={`text-white px-4 rounded-r-md flex items-center justify-center ${
            isDisabled || !question || question.length === 0
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-600"
          }`}
          aria-label="Send message"
          disabled={isDisabled || !question || question.length === 0}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 10l7-7m0 0l7 7m-7-7v18"
            />
          </svg>
        </button>
      </div>
    </form>
  );
};

export default ChatInput;
