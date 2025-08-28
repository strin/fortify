import React from "react";
import { Loader2 } from "lucide-react";

interface LoadingProps {
  text?: string;
  size?: "sm" | "md" | "lg";
  fullScreen?: boolean;
}

export function Loading({
  text = "Loading...",
  size = "sm",
  fullScreen = false,
}: LoadingProps) {
  const sizeMap = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  const containerClasses = fullScreen
    ? "flex items-center justify-center h-screen"
    : "flex items-center justify-center py-8";

  return (
    <div className={containerClasses}>
      <div className="flex items-center gap-2">
        <div className="animate-spin">
          <Loader2 className={sizeMap[size]} />
        </div>
        <p className="text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}
