"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { signIn } from "next-auth/react";

export default function ExitIntentPopup() {
  const [showPopup, setShowPopup] = useState(false);
  const [hasShown, setHasShown] = useState(false);

  useEffect(() => {
    const handleMouseLeave = (e: MouseEvent) => {
      // Only trigger when cursor leaves from the top of the page
      if (e.clientY <= 0 && !hasShown) {
        setShowPopup(true);
        setHasShown(true);
      }
    };

    // Add a small delay before enabling exit intent detection
    const timer = setTimeout(() => {
      document.addEventListener("mouseleave", handleMouseLeave);
    }, 5000); // Wait 5 seconds before enabling

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [hasShown]);

  const handleGetFreeScan = () => {
    signIn("github", { callbackUrl: "/dashboard" });
    setShowPopup(false);
  };

  return (
    <Dialog open={showPopup} onOpenChange={setShowPopup}>
      <DialogContent className="sm:max-w-md bg-gray-900 border-blue-500/20">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center text-white mb-2">
            Wait! Don&apos;t Leave Your Code Vulnerable
          </DialogTitle>
        </DialogHeader>

        <div className="text-center space-y-4">
          <div className="text-4xl mb-4">🔒</div>
          <p className="text-gray-300 mb-6">
            Get a free security assessment of your most critical repository
            before you go!
          </p>

          <div className="space-y-3">
            <Button
              onClick={handleGetFreeScan}
              className="w-full"
              size="xl"
              variant="cta"
            >
              Claim My Free Scan
            </Button>

            <div className="text-sm text-gray-400">
              ✅ No credit card required • ✅ Results in 60 seconds • ✅
              Read-only GitHub access
            </div>

            <Button
              variant="ghost"
              onClick={() => setShowPopup(false)}
              className="text-gray-400 hover:text-white"
            >
              No thanks, I&apos;ll take the risk
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
