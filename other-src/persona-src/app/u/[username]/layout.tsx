import React from "react";
import { AnimatePresence } from "framer-motion";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex flex-col items-center justify-start h-full bg-background text-foreground overflow-hidden"
      style={{ overscrollBehavior: "none" }}
    >
      <AnimatePresence mode="wait">{children}</AnimatePresence>
    </div>
  );
}
