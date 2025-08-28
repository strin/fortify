"use client";

import { useState, useEffect } from "react";
import { Creator } from "@/types";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Copy, Share2, Trash2 } from "lucide-react";

interface Clone {
  id: number;
  name: string;
  slug: string;
}

interface CloneOthersViewProps {
  creator: Creator;
  cloneSlug: string;
}

export default function CloneOthersView({
  creator,
  cloneSlug,
}: CloneOthersViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [clone, setClone] = useState<Clone | null>(null);
  const [shareUrl, setShareUrl] = useState("");
  const [embedCode, setEmbedCode] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Fetch clone data
  useEffect(() => {
    const fetchClone = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/clones/by-slug/${cloneSlug}`);

        if (!response.ok) {
          throw new Error("Failed to fetch clone");
        }

        const data = await response.json();
        setClone(data);

        // Generate share URL and embed code
        const baseUrl = window.location.origin;
        const shareUrl = `${baseUrl}/c/${creator.username}/${cloneSlug}`;
        setShareUrl(shareUrl);

        const embedCode = `<iframe src="${shareUrl}/embed" width="100%" height="600" frameborder="0"></iframe>`;
        setEmbedCode(embedCode);
      } catch (error) {
        console.error("Error fetching clone:", error);
        toast.error("Failed to load clone data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchClone();
  }, [cloneSlug, creator.username]);

  const copyToClipboard = (text: string, successMessage: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        toast.success(successMessage);
      })
      .catch((err) => {
        console.error("Failed to copy text: ", err);
        toast.error("Failed to copy to clipboard");
      });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p>Loading clone data...</p>
      </div>
    );
  }

  if (!clone) {
    return (
      <div className="flex justify-center items-center h-64">
        <p>Clone not found</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-8">
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setDeleteDialogOpen(true)}
            className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Sharing</CardTitle>
            <CardDescription>Share your clone with others</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="share-url">Share URL</Label>
              <div className="flex gap-2">
                <Input
                  id="share-url"
                  value={shareUrl}
                  readOnly
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    copyToClipboard(shareUrl, "URL copied to clipboard")
                  }
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="embed-code">Embed Code</Label>
              <div className="flex gap-2">
                <Textarea
                  id="embed-code"
                  value={embedCode}
                  readOnly
                  className="flex-1 h-24"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    copyToClipboard(embedCode, "Embed code copied to clipboard")
                  }
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-4">
              <Switch
                id="public-mode"
                checked={isPublic}
                onCheckedChange={setIsPublic}
              />
              <Label htmlFor="public-mode">Public Mode</Label>
            </div>
            <p className="text-sm text-muted-foreground">
              When enabled, anyone with the link can access this clone.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Social Sharing</CardTitle>
            <CardDescription>Share your clone on social media</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" className="w-full">
                <Share2 className="h-4 w-4 mr-2" />
                Twitter
              </Button>
              <Button variant="outline" className="w-full">
                <Share2 className="h-4 w-4 mr-2" />
                Facebook
              </Button>
              <Button variant="outline" className="w-full">
                <Share2 className="h-4 w-4 mr-2" />
                LinkedIn
              </Button>
              <Button variant="outline" className="w-full">
                <Share2 className="h-4 w-4 mr-2" />
                Email
              </Button>
            </div>

            <div className="pt-4">
              <h3 className="text-sm font-medium mb-2">QR Code</h3>
              <div className="bg-muted h-40 flex items-center justify-center">
                <p className="text-muted-foreground">
                  QR Code would be generated here
                </p>
              </div>
              <div className="flex justify-end mt-2">
                <Button variant="outline" size="sm">
                  <Copy className="h-4 w-4 mr-2" />
                  Download QR Code
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Advanced Settings</CardTitle>
          <CardDescription>
            Additional configuration options for your clone
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="custom-domain">Custom Domain</Label>
              <Input id="custom-domain" placeholder="yourdomain.com" />
              <p className="text-xs text-muted-foreground">
                Requires DNS configuration
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password-protection">Password Protection</Label>
              <Input
                id="password-protection"
                type="password"
                placeholder="Set a password"
              />
              <p className="text-xs text-muted-foreground">
                Visitors will need this password to access your clone
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-4">
            <Switch id="analytics" />
            <Label htmlFor="analytics">Enable Analytics</Label>
          </div>
          <p className="text-sm text-muted-foreground">
            Track visitor interactions with your clone
          </p>
        </CardContent>
      </Card>
    </>
  );
}
