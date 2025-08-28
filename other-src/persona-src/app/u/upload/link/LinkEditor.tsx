"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Creator } from "@/types";
import { toast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";

interface ContentLink {
  id: string;
  url: string;
  title: string;
  createdAt: string;
}

interface LinkEditorProps {
  creator: Creator;
}

export default function LinkEditor({ creator }: LinkEditorProps) {
  const [links, setLinks] = useState<ContentLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLink, setNewLink] = useState({ url: "", title: "" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isAddingLink, setIsAddingLink] = useState(false);

  useEffect(() => {
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    try {
      const response = await fetch(`/api/creators/${creator.id}/contentlinks`);
      if (!response.ok) throw new Error("Failed to fetch links");
      const data = await response.json();
      setLinks(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load links",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddLink = async () => {
    if (!newLink.url) {
      toast({
        title: "Error",
        description: "Please enter a URL",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsAddingLink(true);
      const urlObject = new URL(newLink.url);
    } catch (error) {
      toast({
        title: "Error",
        description: "Please enter a valid URL",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`/api/creators/${creator.id}/contentlinks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newLink),
      });

      if (!response.ok) throw new Error("Failed to add link");

      const addedLink = await response.json();
      setLinks([...links, addedLink]);
      setNewLink({ url: "", title: "" });
      setDialogOpen(false);
      toast({
        title: "Success",
        description: "Link added successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add link",
        variant: "destructive",
      });
    } finally {
      setIsAddingLink(false);
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    try {
      const response = await fetch(
        `/api/creators/${creator.id}/contentlinks/${linkId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) throw new Error("Failed to delete link");

      setLinks(links.filter((link) => link.id !== linkId));
      toast({
        title: "Success",
        description: "Link deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete link",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Content Links</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Link
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Link</DialogTitle>
              <DialogDescription>
                Add a new content link to your collection
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">URL</label>
                <Input
                  value={newLink.url}
                  onChange={(e) =>
                    setNewLink({ ...newLink, url: e.target.value })
                  }
                  placeholder="https://..."
                />
              </div>
              {/*               <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={newLink.title}
                  onChange={(e) =>
                    setNewLink({ ...newLink, title: e.target.value })
                  }
                  placeholder="Link title..."
                />
              </div> */}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleAddLink} disabled={isAddingLink}>
                {isAddingLink ? "Adding Link..." : "Add Link"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="space-y-4">
          {links.map((link) => (
            <div
              key={link.id}
              className="p-4 border rounded-lg flex justify-between items-center group"
            >
              <div>
                <h3 className="font-medium">{link.title}</h3>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-500 hover:underline"
                >
                  {link.url}
                </a>
              </div>
              <div className="text-sm text-gray-500">
                {new Date(link.createdAt).toLocaleDateString()}
              </div>
              <div className="text-sm text-gray-500">
                <Trash2
                  className="h-4 w-4 text-red-500 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleDeleteLink(link.id)}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <Toaster />
    </div>
  );
}
