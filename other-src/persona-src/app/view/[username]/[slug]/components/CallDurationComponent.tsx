import React from "react";
import { useLiveKit } from "@/components/transports/LiveKit";

export const CallDurationComponent = () => {
  const { isConnected, callDuration } = useLiveKit();

  if (!isConnected) return null;

  return (
    <h2 className="text-xl text-foreground">
      {Math.floor(callDuration / 60)
        .toString()
        .padStart(2, "0")}
      :{(callDuration % 60).toString().padStart(2, "0")}
    </h2>
  );
}; 