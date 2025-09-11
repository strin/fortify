"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon, Plus } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
    variant?: "default" | "outline" | "cta";
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  className?: string;
  size?: "sm" | "default" | "lg";
}

const sizeVariants = {
  sm: {
    container: "py-8",
    icon: "h-8 w-8",
    title: "text-base",
    description: "text-sm",
  },
  default: {
    container: "py-12",
    icon: "h-12 w-12",
    title: "text-lg",
    description: "text-base",
  },
  lg: {
    container: "py-16",
    icon: "h-16 w-16",
    title: "text-xl",
    description: "text-lg",
  },
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  size = "default",
}: EmptyStateProps) {
  const sizeConfig = sizeVariants[size];
  const ActionIcon = action?.icon || Plus;
  const SecondaryActionIcon = secondaryAction?.icon;

  return (
    <Card className={cn("bg-card border-border", className)}>
      <CardContent className={cn("text-center", sizeConfig.container)}>
        {Icon && (
          <Icon className={cn("mx-auto mb-4 text-muted-foreground", sizeConfig.icon)} />
        )}
        <h3 className={cn("font-semibold mb-2", sizeConfig.title)}>{title}</h3>
        <p className={cn("text-muted-foreground mb-6 max-w-md mx-auto", sizeConfig.description)}>
          {description}
        </p>
        {action && (
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              onClick={action.onClick} 
              variant={action.variant || "default"}
              size={size === "lg" ? "lg" : "default"}
            >
              <ActionIcon className="h-4 w-4 mr-2" />
              {action.label}
            </Button>
            {secondaryAction && (
              <Button 
                onClick={secondaryAction.onClick} 
                variant="outline"
                size={size === "lg" ? "lg" : "default"}
              >
                {SecondaryActionIcon && <SecondaryActionIcon className="h-4 w-4 mr-2" />}
                {secondaryAction.label}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Specialized empty states for common patterns
export function NoDataState({
  title = "No data available",
  description = "There's nothing to show here yet.",
  action,
  className,
}: {
  title?: string;
  description?: string;
  action?: EmptyStateProps["action"];
  className?: string;
}) {
  return (
    <EmptyState
      title={title}
      description={description}
      action={action}
      className={className}
    />
  );
}

export function NoResultsState({
  searchTerm,
  onClearSearch,
  className,
}: {
  searchTerm: string;
  onClearSearch: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      title="No results found"
      description={`No items match "${searchTerm}". Try adjusting your search or filters.`}
      action={{
        label: "Clear search",
        onClick: onClearSearch,
        variant: "outline",
      }}
      className={className}
      size="sm"
    />
  );
}
