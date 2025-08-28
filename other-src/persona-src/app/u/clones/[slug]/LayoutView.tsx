"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Edit, Edit2 } from "lucide-react";
import useUser from "@/lib/creator";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface CloneLayoutProps {
  username: string;
  slug: string;
  children: React.ReactNode;
}

export default function CloneLayout({
  username,
  slug,
  children,
}: CloneLayoutProps) {
  const pathname = usePathname();

  // Define the tabs
  const tabs = [
    { label: "Edit", path: `/u/clones/${slug}/edit` },
    { label: "Dashboard", path: `/u/clones/${slug}/dash` },
    { label: "Meetings", path: `/u/clones/${slug}/meetings` },
    { label: "Others", path: `/u/clones/${slug}/others` },
  ];

  // Determine the active tab
  const activeTab =
    tabs.find((tab) => pathname === tab.path)?.path || tabs[0].path;

  // Fetch clone display name
  const [cloneName, setCloneName] = useState<string | null>(null);
  const [cloneId, setCloneId] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const fetchCloneName = async () => {
      try {
        const response = await fetch(`/api/clones/by-slug/${slug}`);
        const data = await response.json();
        if (data.name) {
          setCloneName(data.name);
        }
        if (data.id) {
          setCloneId(data.id);
        }
      } catch (error) {
        console.error("Error fetching clone name:", error);
      }
    };

    fetchCloneName();
  }, [slug]);

  const handleEditClick = () => {
    if (!cloneName) return;

    setIsEditing(true);
    setEditedName(cloneName);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedName(e.target.value);
  };

  const handleNameBlur = async () => {
    if (editedName && editedName !== cloneName) {
      try {
        const response = await fetch(`/api/clones/${cloneId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: editedName }),
        });

        if (response.ok) {
          setCloneName(editedName);
        } else {
          console.error("Failed to update clone name");
        }
      } catch (error) {
        console.error("Error updating clone name:", error);
      }
    }
    setIsEditing(false);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col space-y-6">
        <div className="flex items-center">
          <Link
            href="/u/clones"
            className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Presentations
          </Link>
        </div>

        <div className="space-y-4 border-b pb-4">
          {/* GitHub-like slug display */}
          <div className="flex flex-row gap-2 justify-between">
            <div className="flex flex-col">
              {username && slug && (
                <div className="flex items-center">
                  <div className="text-sm font-medium text-muted-foreground">
                    {username}/{slug}
                  </div>
                </div>
              )}

              {cloneName ? (
                <div
                  className="flex items-center"
                  onMouseEnter={() => setIsHovering(true)}
                  onMouseLeave={() => setIsHovering(false)}
                >
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedName}
                      onChange={handleNameChange}
                      onBlur={handleNameBlur}
                      autoFocus
                      className="text-3xl font-bold tracking-tight border-b border-primary outline-none bg-transparent"
                    />
                  ) : (
                    <h1
                      className="text-3xl font-bold tracking-tight cursor-pointer"
                      onClick={handleEditClick}
                    >
                      {cloneName}
                    </h1>
                  )}
                  {(isHovering || isEditing) && (
                    <button
                      onClick={handleEditClick}
                      className="p-1 hover:bg-muted rounded-full transition-colors"
                    >
                      <Edit className="h-4 w-4 text-muted-foreground" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="h-9 w-[400px] animate-pulse rounded-md bg-muted" />
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(
                  `${window.location.origin}/c/${username}/${slug}`
                );
                toast.success("Link copied to clipboard");
              }}
            >
              Copy Link
            </Button>
          </div>

          <Tabs value={activeTab} className="w-full">
            <TabsList className="w-full max-w-md grid grid-cols-4 gap-1">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.path}
                  value={tab.path}
                  className="flex-1 font-medium w-full"
                  asChild
                >
                  <Link href={tab.path}>{tab.label}</Link>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div className="py-0">{children}</div>
      </div>
    </div>
  );
}
