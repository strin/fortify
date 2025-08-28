"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useParams } from "next/navigation";
import Logo from "@/components/Logo";
import { Skeleton } from "@/components/ui/skeleton";
import SlidesSideBar from "./components/SlidesSideBar";
import { DeckImageSlide, DeckMarkdownSlide, DeckSlide } from "./types";

export default function SlideEditorPage() {
  const { id } = useParams();
  const [slides, setSlides] = useState<DeckSlide[]>([]);
  const [title, setTitle] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSlideDeck = async () => {
      try {
        setLoading(true);
        // Replace with your actual API endpoint
        const response = await fetch(`/api/slide-decks/${id}`);
        console.log("slides response", response);

        if (!response.ok) {
          throw new Error(`Failed to fetch slide deck: ${response.statusText}`);
        }

        const data = await response.json();
        const slides = [];
        slides.push(...(data.DeckImageSlide as DeckImageSlide[]));
        slides.push(...(data.DeckMarkdownSlide as DeckMarkdownSlide[]));
        slides.sort((a, b) => a.order - b.order);
        setSlides(slides);
        setTitle(data.title);
      } catch (err) {
        console.error("Error fetching slide deck:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch slide deck"
        );
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchSlideDeck();
    }
  }, [id]);

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-64 border-r border-gray-200">
        <Logo />

        {loading ? (
          <Skeleton className="h-full w-full" />
        ) : (
          <SlidesSideBar slides={slides} />
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          {loading ? (
            <div className="h-8 w-64">
              <Skeleton className="h-full w-full" />
            </div>
          ) : (
            <h1 className="text-2xl font-semibold">
              {title ? title : "Untitled"}
            </h1>
          )}
          <div className="flex gap-6">
            <button className="text-gray-700 hover:text-gray-900">FAQs</button>
            <button className="text-gray-700 hover:text-gray-900">
              Analytics
            </button>
            <button className="text-gray-700 hover:text-gray-900">
              Settings
            </button>
          </div>
        </div>

        {/* Content area - show loading, error, or content */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xl">Loading slide deck...</p>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xl text-red-500">Error: {error}</p>
          </div>
        ) : slides && slides.length > 0 ? (
          <div className="flex-1 p-8">
            {/* Actual slide content would go here */}
            <p className="text-xl">Select a slide from the sidebar to edit</p>
          </div>
        ) : (
          // Empty state
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="relative w-24 h-24 mb-6">
              <div className="absolute inset-0 bg-red-500 rounded-lg flex items-center justify-center">
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 4V20M4 12H20"
                    stroke="white"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div className="absolute bottom-0 right-0 w-12 h-12 bg-white rounded-lg border-2 border-red-500 transform translate-x-2 translate-y-2"></div>
            </div>

            <h2 className="text-4xl font-bold mb-4">No slides yet</h2>
            <p className="text-xl mb-8">
              Get started by adding your{" "}
              <span className="font-bold">first slide</span>.
            </p>

            <Button
              variant="destructive"
              size="lg"
              className="rounded-full px-8 text-lg"
            >
              New Slide
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
