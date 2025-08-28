"use client";

import { useParams } from "next/navigation";
import Image from "next/image";
import { useState, useEffect } from "react";
import Logo from "@/components/Logo/Logo";
import Markdown from "react-markdown";

interface DeckMarkdownSlide {
  id: string;
  title: string;
  markdown: string;
  script?: string;
  context?: string;
}

interface SlideDeck {
  id: string;
  title: string;
  DeckMarkdownSlide: DeckMarkdownSlide[];
}

export default function LivelyEditor() {
  const { id } = useParams();
  const [deck, setDeck] = useState<SlideDeck | null>(null);
  const [selectedSlide, setSelectedSlide] = useState<DeckMarkdownSlide | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDeck = async () => {
      try {
        const response = await fetch(`/api/slide-decks/${id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch deck");
        }
        const data = await response.json();
        setDeck(data);
        console.log("data", data);
        if (data.DeckMarkdownSlide.length > 0) {
          setSelectedSlide(data.DeckMarkdownSlide[0]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDeck();
  }, [id]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b h-16">
        <div className="flex items-center gap-8">
          <Logo />
          <h1 className="text-xl font-semibold">{deck?.title}</h1>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Main Slide View */}
        <div className="flex-1 p-8 flex items-center justify-center">
          <div className="w-full aspect-[16/9] bg-gray-100 rounded-lg">
            <Markdown
              className="prose prose-sm md:prose-base lg:prose-lg max-w-none h-full p-8 prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl"
              components={{
                ul: ({ node, ...props }) => (
                  <ul className="list-disc list-inside" {...props} />
                ),
                ol: ({ node, ...props }) => (
                  <ol className="list-decimal list-inside" {...props} />
                ),
                h1: ({ node, ...props }) => (
                  <h1 className="text-2xl font-bold mt-4 mb-2" {...props} />
                ),
                h2: ({ node, ...props }) => (
                  <h2 className="text-xl font-bold mt-3 mb-2" {...props} />
                ),
                h3: ({ node, ...props }) => (
                  <h3 className="text-lg font-bold mt-2 mb-1" {...props} />
                ),
              }}
            >
              {selectedSlide?.markdown}
            </Markdown>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-80 border-l p-4">
          <div className="space-y-6">
            <div>
              <h3 className="font-medium mb-2">Script</h3>
              <textarea
                className="w-full h-32 p-2 border rounded"
                value={selectedSlide?.script || ""}
                onChange={(e) => {
                  /* Handle script change */
                }}
              />
            </div>
            <div>
              <h3 className="font-medium mb-2">Context</h3>
              <textarea
                className="w-full h-32 p-2 border rounded"
                value={selectedSlide?.context || ""}
                onChange={(e) => {
                  /* Handle context change */
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Thumbnail Bar */}
      <div className="h-24 border-t p-4">
        <div className="flex gap-4 overflow-x-auto">
          {deck?.DeckMarkdownSlide.map((slide, index) => (
            <div
              key={slide.id}
              className={`relative flex-shrink-0 w-32 aspect-[16/9] bg-gray-200 rounded cursor-pointer
                ${
                  selectedSlide?.id === slide.id ? "ring-2 ring-blue-500" : ""
                }`}
              onClick={() => setSelectedSlide(slide)}
            >
              <div className="absolute bottom-1 left-1 bg-gray-800/50 text-white text-xs px-1.5 py-0.5 rounded">
                {index + 1}
              </div>
              {/* Thumbnail preview of slide.markdown */}
              <Markdown
                className="text-xs p-2"
                components={{
                  p: () => null,
                  ul: () => null,
                  ol: () => null,
                  li: () => null,
                  blockquote: () => null,
                  code: () => null,
                  img: () => null,
                  h1: ({ node, ...props }) => (
                    <h1 className="text-xs font-bold px-2 py-1" {...props} />
                  ),
                  h2: ({ node, ...props }) => (
                    <h2
                      className="text-xs font-semibold px-2 py-1"
                      {...props}
                    />
                  ),
                  h3: ({ node, ...props }) => (
                    <h3 className="text-xs px-2 py-1" {...props} />
                  ),
                }}
              >
                {slide.markdown}
              </Markdown>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
