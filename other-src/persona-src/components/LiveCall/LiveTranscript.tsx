"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useLiveKit } from "@/components/transports/LiveKit";
import { Creator } from "@/types";

interface LiveCallTranscriptProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  creator: Creator;
}

const LiveTranscript: React.FC<LiveCallTranscriptProps> = ({
  open,
  onOpenChange,
  creator,
}) => {
  const { transcriptHistory } = useLiveKit();
  const transcriptEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [transcriptHistory]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y- bg-background text-foreground">
        <DialogHeader>
          <DialogTitle className="text-foreground">Call Transcript</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4 [&>button]:text-foreground overflow-y-scroll max-h-[400px]">
          {transcriptHistory.map((entry, index) => (
            <div key={index} className="flex flex-col space-y-1">
              <span className="text-sm font-medium text-foreground/80">
                {entry.role === "assistant"
                  ? creator.display_name || "Persona"
                  : "You"}
                :
              </span>
              <p className="text-sm text-foreground/70">{entry.content}</p>
            </div>
          ))}
          {transcriptHistory.length === 0 && (
            <p className="text-sm text-muted-foreground text-center">
              No transcript available yet
            </p>
          )}
          <div ref={transcriptEndRef} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LiveTranscript;
