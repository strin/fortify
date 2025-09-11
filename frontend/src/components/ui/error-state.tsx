"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  description?: string;
  error?: string | Error;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
  variant?: "default" | "network" | "not-found" | "permission";
  showIcon?: boolean;
}

const errorVariants = {
  default: {
    icon: AlertCircle,
    title: "Something went wrong",
    description: "An unexpected error occurred. Please try again.",
    iconColor: "text-destructive",
  },
  network: {
    icon: WifiOff,
    title: "Connection problem",
    description: "Please check your internet connection and try again.",
    iconColor: "text-orange-500",
  },
  "not-found": {
    icon: AlertCircle,
    title: "Not found",
    description: "The resource you're looking for doesn't exist.",
    iconColor: "text-muted-foreground",
  },
  permission: {
    icon: AlertCircle,
    title: "Access denied",
    description: "You don't have permission to access this resource.",
    iconColor: "text-red-500",
  },
};

export function ErrorState({
  title,
  description,
  error,
  onRetry,
  retryLabel = "Try again",
  className,
  variant = "default",
  showIcon = true,
}: ErrorStateProps) {
  const variantConfig = errorVariants[variant];
  const Icon = variantConfig.icon;
  
  const errorMessage = error instanceof Error ? error.message : error;
  const displayTitle = title || variantConfig.title;
  const displayDescription = description || errorMessage || variantConfig.description;

  return (
    <Card className={cn("border-destructive/20 bg-destructive/5", className)}>
      <CardContent className="text-center py-8">
        {showIcon && (
          <Icon className={cn("h-12 w-12 mx-auto mb-4", variantConfig.iconColor)} />
        )}
        <h3 className="text-lg font-semibold mb-2">{displayTitle}</h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          {displayDescription}
        </p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            {retryLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// Specialized error state for inline errors
export function InlineErrorState({
  error,
  onRetry,
  className,
}: {
  error: string | Error;
  onRetry?: () => void;
  className?: string;
}) {
  const errorMessage = error instanceof Error ? error.message : error;
  
  return (
    <div className={cn("flex items-center justify-between p-4 border border-destructive/20 bg-destructive/10 rounded-lg text-sm", className)}>
      <div className="flex items-center gap-2 text-destructive">
        <AlertCircle className="h-4 w-4 flex-shrink-0" />
        <span>{errorMessage}</span>
      </div>
      {onRetry && (
        <Button 
          onClick={onRetry} 
          variant="outline" 
          size="sm"
          className="ml-4 flex-shrink-0"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Retry
        </Button>
      )}
    </div>
  );
}
