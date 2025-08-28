"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Settings,
  Copy,
  LinkIcon,
  Trash2,
  Edit,
  Loader2,
} from "lucide-react";
import { Creator } from "@/types";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import NewLivelyDialog from "./create-new-dialog/NewLivelyDialog";

interface CloneType {
  id: string | number;
  name: string;
  excpetedDurationMs?: number;
  slug: string;
  createdAt?: string;
  updatedAt?: string;
}

interface CloneTypesViewProps {
  creator: Creator;
}

export default function ClonesView({ creator }: CloneTypesViewProps) {
  const [cloneTypes, setCloneTypes] = useState<CloneType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [newClone, setNewClone] = useState({
    name: "",
    expectedDurationMs: 15,
    slug: "",
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [isCreatingClone, setIsCreatingClone] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const router = useRouter();
  const { toast: useToastToast } = useToast();

  // Fetch clones from API
  useEffect(() => {
    const fetchClones = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/clones?creatorId=${creator.id}`);

        if (!response.ok) {
          throw new Error("Failed to fetch clones");
        }

        const data = await response.json();

        // Transform the data to match our component's expected format
        const formattedClones = data.map((clone: CloneType) => ({
          id: clone.id,
          name: clone.name,
          excpetedDurationMs: clone.excpetedDurationMs,
          slug: clone.slug,
          createdAt: clone.createdAt,
          updatedAt: clone.updatedAt,
        }));

        setCloneTypes(formattedClones);
      } catch (error) {
        console.error("Error fetching clones:", error);
        toast.error("Failed to load clones");
      } finally {
        setIsLoading(false);
      }
    };

    fetchClones();
  }, [creator.id]);

  // Helper function to format duration from milliseconds to human-readable format
  const formatDuration = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      if (remainingMinutes === 0) {
        return `${hours} hr`;
      }
      return `${hours} hr ${remainingMinutes} min`;
    }
    return `${minutes} min`;
  };

  const handleCopyLink = (e: React.MouseEvent, cloneSlug: string) => {
    e.stopPropagation();
    const url = `${window.location.origin}/c/${creator.username}/${cloneSlug}`;
    navigator.clipboard.writeText(url);
    useToastToast({
      title: "Link copied to clipboard",
      description: url,
    });
  };

  const handleCreateClone = async () => {
    if (!newClone.name.trim()) {
      toast.error("Please enter a name for your clone");
      return;
    }

    try {
      setIsCreatingClone(true);

      const slug = newClone.name.toLowerCase().replace(/\s+/g, "-");

      const response = await fetch("/api/clones", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newClone.name,
          expectedDurationMs: newClone.expectedDurationMs,
          slug,
          creatorId: creator.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create clone");
      }

      const newCloneData = await response.json();

      const newCloneType: CloneType = {
        id: newCloneData.id,
        name: newCloneData.name,
        excpetedDurationMs: newCloneData.excpetedDurationMs,
        slug: newCloneData.slug,
        createdAt: newCloneData.createdAt,
        updatedAt: newCloneData.updatedAt,
      };

      setCloneTypes([...cloneTypes, newCloneType]);
      setNewClone({
        name: "",
        expectedDurationMs: 1800000,
        slug: "",
      });
      setDialogOpen(false);

      toast.success("Clone type created successfully");
    } catch (error) {
      toast.error("Failed to create clone type");
      console.error(error);
    } finally {
      setIsCreatingClone(false);
    }
  };

  const navigateToClone = (slug: string) => {};

  console.log("cloneTypes", cloneTypes);

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">My Presentations</h1>
          <p className="text-muted-foreground mt-1">
            Create personal agents that represent you in different types of
            meetings.
          </p>
        </div>
        <NewLivelyDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onTemplateSelect={() => {}}
          creatorId={creator.id}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : cloneTypes.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <p className="text-muted-foreground mb-4">
            You don&apos;t have any clones yet
          </p>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Your First Clone
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {cloneTypes.map((cloneType) => (
            <Card
              key={cloneType.id}
              className="flex flex-col justify-between h-full max-w-md cursor-pointer transition-all duration-200 hover:shadow-md hover:translate-y-[-2px] bg-background border-border"
              onClick={() => {
                router.push(`/u/clones/${cloneType.slug}/edit`);
              }}
            >
              <CardHeader>
                <CardTitle className="text-foreground">
                  {cloneType.name}
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Expected duration:{" "}
                  {formatDuration(cloneType.excpetedDurationMs ?? 0)}
                </CardDescription>
              </CardHeader>
              <CardFooter className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    const link = `${window.location.origin}/c/${creator.username}/${cloneType.slug}`;
                    navigator.clipboard.writeText(link);
                    toast.success("Link copied to clipboard");
                  }}
                  title="Copy share link"
                  className="border-border hover:bg-accent flex gap-2 items-center"
                >
                  <LinkIcon className="h-4 w-4" />
                  Share Link
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
