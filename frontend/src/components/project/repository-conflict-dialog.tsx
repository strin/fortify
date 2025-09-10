"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  GitBranch, 
  Calendar, 
  ExternalLink,
  AlertCircle 
} from "lucide-react";

export interface ProjectConflict {
  type: "REPOSITORY_EXISTS";
  repository: {
    id: string;
    fullName: string;
    description: string | null;
  };
  existingProject: {
    id: string;
    name: string;
    description: string | null;
    createdAt: string;
  };
}

interface RepositoryConflictDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflict: ProjectConflict | null;
  onGoToProject?: () => void;
  onCreateNewProject?: () => void;
  showCreateNewOption?: boolean;
}

export function RepositoryConflictDialog({
  open,
  onOpenChange,
  conflict,
  onGoToProject,
  onCreateNewProject,
  showCreateNewOption = false,
}: RepositoryConflictDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (!conflict) return null;

  const handleGoToProject = async () => {
    try {
      setLoading(true);
      
      if (onGoToProject) {
        onGoToProject();
      } else {
        router.push(`/projects/${conflict.existingProject.id}`);
      }
      
      onOpenChange(false);
    } catch (error) {
      console.error("Error navigating to project:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewProject = async () => {
    try {
      setLoading(true);
      
      if (onCreateNewProject) {
        onCreateNewProject();
      }
      
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating new project:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <DialogTitle>Repository Already Exists</DialogTitle>
          </div>
          <DialogDescription>
            This repository is already associated with an existing project.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Repository Info */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-start gap-2">
              <GitBranch className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {conflict.repository.fullName}
                </p>
                {conflict.repository.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {conflict.repository.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Existing Project Info */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Existing Project:</p>
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{conflict.existingProject.name}</h3>
                <Badge variant="secondary" className="text-xs">
                  Existing
                </Badge>
              </div>
              
              {conflict.existingProject.description && (
                <p className="text-sm text-muted-foreground">
                  {conflict.existingProject.description}
                </p>
              )}
              
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>
                  Created {format(new Date(conflict.existingProject.createdAt), "MMM d, yyyy")}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-sm text-muted-foreground">
              You can go to the existing project to view its scans and settings, or 
              {showCreateNewOption && " you can create a new project anyway (this will allow the same repository in multiple projects)."} 
              {!showCreateNewOption && " cancel to select a different repository."}
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          
          {showCreateNewOption && (
            <Button
              variant="outline"
              onClick={handleCreateNewProject}
              disabled={loading}
            >
              Create New Project Anyway
            </Button>
          )}
          
          <Button
            onClick={handleGoToProject}
            disabled={loading}
            className="gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Go to Existing Project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}