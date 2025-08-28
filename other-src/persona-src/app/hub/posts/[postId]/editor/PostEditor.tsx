"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Creator } from "@/types";
import { X } from "lucide-react";
import { creatorStorage, creatorPublicStorage } from "@/lib/supabase";
import { Toaster } from "@/components/ui/toaster";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface Post {
  id: number;
  title: string;
  summary: string;
  overview: string;
  coverImages: string[];
}

export default function PostEditor({
  postId,
  creator,
}: {
  postId: string;
  creator: Creator;
}) {
  const { toast } = useToast();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

  useEffect(() => {
    fetchPost();
  }, [postId]);

  const fetchPost = async () => {
    try {
      const response = await fetch(`/api/posts/${postId}`);
      if (!response.ok) throw new Error("Failed to fetch post");
      const data = await response.json();
      setPost(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load post",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!post) return;
    console.log("post", post);

    try {
      setSaving(true);
      const response = await fetch(`/api/posts/${postId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: post.title,
          summary: post.summary,
          overview: post.overview,
          coverImages: post.coverImages,
        }),
      });

      if (!response.ok) throw new Error("Failed to save post");

      toast({
        title: "Success",
        description: "Post saved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save post",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !post) return;

    try {
      setUploadingImages(true);
      const files = Array.from(e.target.files);
      const newImageUrls: string[] = [];

      for (const file of files) {
        console.log("uploading file", file);
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}`;
        const filePath = `users/${creator.id}/photos/${fileName}.${fileExt}`;

        const { error: uploadError, data } = await creatorPublicStorage.upload(
          filePath,
          file
        );

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = creatorPublicStorage.getPublicUrl(filePath);

        newImageUrls.push(publicUrl);
      }

      setPost({
        ...post,
        coverImages: [...(post.coverImages || []), ...newImageUrls],
      });

      toast({
        title: "Success",
        description: "Images uploaded successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload images",
        variant: "destructive",
      });
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (indexToRemove: number) => {
    if (!post) return;
    setPost({
      ...post,
      coverImages: post.coverImages.filter(
        (_, index) => index !== indexToRemove
      ),
    });
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!post) {
    return <div>Post not found</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <Link
        href="/hub/posts"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Posts
      </Link>

      <div className="space-y-2">
        <label className="text-sm font-medium">Title</label>
        <Input
          value={post.title}
          onChange={(e) => setPost({ ...post, title: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Summary</label>
        <Textarea
          value={post.summary}
          onChange={(e) => setPost({ ...post, summary: e.target.value })}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Overview</label>
        <Textarea
          value={post.overview}
          onChange={(e) => setPost({ ...post, overview: e.target.value })}
          rows={6}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Cover Images</label>
        <div className="grid grid-cols-3 gap-4">
          {post.coverImages &&
            post.coverImages.length > 0 &&
            post.coverImages.map((url, index) => (
              <div key={url} className="relative group">
                <img
                  src={url}
                  alt={`Cover ${index + 1}`}
                  className="w-full h-32 object-cover rounded-md"
                />
                <button
                  onClick={() => removeImage(index)}
                  className="absolute top-2 right-2 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-4 w-4 text-white" />
                </button>
              </div>
            ))}
        </div>
        <Input
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageUpload}
          disabled={uploadingImages}
        />
      </div>

      <Button
        onClick={handleSave}
        disabled={saving || uploadingImages}
        className="w-full"
      >
        {saving ? "Saving..." : "Save Changes"}
      </Button>
      <Toaster />
    </div>
  );
}
