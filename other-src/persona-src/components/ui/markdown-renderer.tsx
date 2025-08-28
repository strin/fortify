import React from "react";
import ReactMarkdown from "react-markdown";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({
  content,
  className = "",
}: MarkdownRendererProps) {
  return (
    <div className={`prose dark:prose-invert max-w-none ${className}`}>
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold mb-4">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-bold mb-3">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-bold mb-2">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-base font-bold mb-2">{children}</h4>
          ),
          h5: ({ children }) => (
            <h5 className="text-sm font-bold mb-1">{children}</h5>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside mb-4">{children}</ul>
          ),
          li: ({ children }) => <li className="mb-1">{children}</li>,
        }}
      >
        {content || "No content available"}
      </ReactMarkdown>
    </div>
  );
}
