"use client";

import React from "react";
import { useRouter } from "next/navigation";

const BackButton: React.FC<{ url?: string }> = ({ url }): JSX.Element => {
  const router = useRouter();

  const handleBack = (): void => {
    if (url) {
      router.push(url);
    } else {
      router.back();
    }
  };

  return (
    <button
      onClick={handleBack}
      className="text-white p-2 rounded-full hover:bg-gray-800 transition-colors"
      aria-label="Go back"
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
          d="M15 19l-7-7 7-7"
        />
      </svg>
    </button>
  );
};

export default BackButton;
