import BackButton from "@/components/BackButton";
import { AnimatePresence } from "framer-motion";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-start h-screen bg-background text-foreground">
      <AnimatePresence mode="wait">{children}</AnimatePresence>
    </div>
  );
}
