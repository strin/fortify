"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Creator, Prompt } from "@/types";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Trash2, Upload, Image } from "lucide-react";
import Link from "next/link";
import { Loading } from "@/components/ui/loading";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { debounce, throttle } from "lodash";
import { creatorStorage } from "@/lib/supabase";
import { uploadBlobImgFromUrl } from "@/services/supabase/storage.supabase";
import crypto from "crypto";

interface Post {
  id: number;
  title: string;
  summary: string;
  overview: string;
  createdAt: string;
  updatedAt: string;
  coverImages: string[];
  prompt: {
    id: number;
  };
}

interface Clone {
  id: number;
  name: string;
  expectedDurationMs: number;
  slug: string;
  postId: number | null;
  createdAt: string;
  updatedAt: string;
}

interface CloneEditViewProps {
  creator: Creator;
  cloneSlug: string;
}

export default function CloneEditView({
  creator,
  cloneSlug,
}: CloneEditViewProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [clone, setClone] = useState<Clone | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [createPostDialogOpen, setCreatePostDialogOpen] = useState(false);
  const [newPost, setNewPost] = useState({
    title: "",
    summary: "",
    overview: "",
  });

  const [welcomeMessage, setWelcomeMessage] = useState<string>("");
  const [promptContent, setPromptContent] = useState<string>("");

  const [post, setPost] = useState<Post | null>(null);
  const [prompt, setPrompt] = useState<Prompt | null>(null);

  // Image upload state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Create a debounced save function that persists between renders
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSavePost = useCallback(
    debounce((post: Post, updates: any) => {
      savePost(post, updates);
    }, 2000),
    []
  );

  // Fetch clone data:
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
      } catch (error) {
        console.error("Error fetching clone:", error);
        toast.error("Failed to load clone data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchClone();
  }, [cloneSlug]);

  // Fetch posts
  useEffect(() => {
    if (!clone) return;
    console.log("clone", clone);

    if (!clone.postId) {
      console.log("Creating post since it's empty");
      const createPost = async () => {
        const response = await fetch("/api/posts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: clone.name,
            summary: "New Post Summary",
            overview: "New Post Overview",
            creatorId: creator.id,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to create post");
        }

        const createdPost = await response.json();
        setClone({ ...clone, postId: createdPost.id });
        await saveClone({ ...clone, postId: createdPost.id });
        setPost(createdPost);
      };

      createPost();
      return;
    }

    const fetchPosts = async () => {
      try {
        const response = await fetch(`/api/posts/${clone?.postId}`);

        if (!response.ok) {
          throw new Error("Failed to fetch posts");
        }

        const data = await response.json();
        setPost(data);
        console.log("post", data);
      } catch (error) {
        console.error("Error fetching posts:", error);
        toast.error("Failed to load posts");
      }
    };

    fetchPosts();
  }, [creator.id, clone?.postId]);

  // Fetch or create prompt when post ID changes
  useEffect(() => {
    const fetchOrCreatePrompt = async () => {
      if (!post || !post.id) return;

      try {
        if (!post?.prompt?.id) {
          console.log("Creating prompt since it doesn't exist");
          // Create a new prompt since one doesn't exist
          const createPromptResponse = await fetch("/api/prompts", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              prompt: "", // Default empty prompt
              creatorId: creator.id,
              welcomeMessage: "Hello! How's your day going?",
            }),
          });

          if (!createPromptResponse.ok) {
            throw new Error("Failed to create prompt");
          }

          const newPrompt = await createPromptResponse.json();
          if (newPrompt.id) {
            setPost((post) => {
              if (!post) return null;
              return { ...post, prompt: { id: newPrompt.id } };
            });
            setPrompt(newPrompt);
            setWelcomeMessage(newPrompt.welcomeMessage || "");
            setPromptContent(newPrompt.content || "");
            await savePost(post, {
              title: post.title,
              overview: post.overview,
              summary: post.summary,
              promptId: newPrompt.id,
            });
          } else {
            throw new Error("Failed to create prompt");
          }
        } else {
          // First try to fetch existing prompt
          const response = await fetch(`/api/prompts?creatorId=${creator.id}`);

          if (!response.ok) {
            throw new Error("Failed to fetch prompt");
          }

          const data = await response.json();
          if (data.length > 0) {
            setPost((post) => {
              if (!post) return null;
              return { ...post, prompt: { id: data[0].id } };
            });
            setPrompt(data[0]);
            setWelcomeMessage(data[0].welcomeMessage || "");
            setPromptContent(data[0].content || "");
          } else {
            throw new Error("Failed to fetch prompt");
          }
        }
      } catch (error) {
        console.error("Error handling prompt:", error);
        toast.error("Failed to handle prompt data");
      }
    };

    fetchOrCreatePrompt();
  }, [post?.id, creator.id]);

  const saveClone = async (updatedClone: Clone) => {
    try {
      setIsSaving(true);

      const response = await fetch(`/api/clones/${updatedClone.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: updatedClone.name,
          expectedDurationMs: updatedClone.expectedDurationMs,
          postId: updatedClone.postId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update clone");
      }

      toast.success("Clone updated successfully");
      router.refresh();
      return true;
    } catch (error) {
      console.error("Error updating clone:", error);
      toast.error("Failed to update clone");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleDurationChange = async (value: string) => {
    if (!clone) return;
    const updatedClone = { ...clone, expectedDurationMs: parseInt(value) };
    setClone(updatedClone);
    await saveClone(updatedClone);
  };

  const handleWelcomeMessageChange = (value: string) => {
    setWelcomeMessage(value);
  };

  const handlePromptContentChange = (value: string) => {
    setPromptContent(value);
  };

  const handlePromptContentBlur = async (
    e: React.FocusEvent<HTMLTextAreaElement>
  ) => {
    if (!prompt) return;

    if (e.target.value === prompt.content) {
      return;
    }

    const content = e.target.value;

    try {
      const response = await fetch(`/api/prompts/${prompt.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: content,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update prompt content");
      }

      setPrompt({ ...prompt, content });
      toast.success("Prompt updated");
    } catch (error) {
      console.error("Error updating prompt content:", error);
      toast.error("Failed to update prompt content");
    }
  };

  const handleWelcomeMessageBlur = async (
    e: React.FocusEvent<HTMLInputElement>
  ) => {
    if (!prompt) return;

    if (e.target.value === prompt.welcomeMessage) {
      return;
    }

    const welcomeMessage = e.target.value;

    try {
      const response = await fetch(`/api/prompts/${prompt.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          welcomeMessage: welcomeMessage,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update welcome message");
      }

      setPrompt({ ...prompt, welcomeMessage });
      toast.success("Welcome message updated");
    } catch (error) {
      console.error("Error updating welcome message:", error);
      toast.error("Failed to update welcome message");
    }
  };

  const savePost = async (
    post: Post,
    {
      title,
      overview,
      summary,
      promptId,
      coverImages,
    }: {
      title?: string;
      overview?: string;
      summary?: string;
      promptId?: number;
      coverImages?: string[];
    }
  ) => {
    const response = await fetch(`/api/posts/${post.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title, overview, summary, promptId, coverImages }),
    });

    if (!response.ok) {
      throw new Error("Failed to update post");
    }

    const updatedPost = await response.json();

    setPost(updatedPost);

    toast.success("Post updated successfully");
  };

  const handlePostChange = async ({
    title,
    overview,
    summary,
  }: {
    title?: string;
    overview?: string;
    summary?: string;
  }) => {
    if (!post) return;
    if (!title) title = post.title;
    if (!overview) overview = post.overview;
    if (!summary) summary = post.summary;

    setPost({ ...post, title, overview, summary });
    // Use the persistent debounced function
    debouncedSavePost(post, {
      title,
      overview,
      summary,
      promptId: post.prompt.id,
    });
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      // Create a preview URL for the selected image
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const handleImageUpload = async () => {
    if (!imageFile || !post || !creator.id) return;

    try {
      setIsUploading(true);

      // Generate a unique hash for the image
      const fileNameHash = crypto
        .createHash("md5")
        .update(`${Date.now()}-${imageFile.name}`)
        .digest("hex");
      const path = `users/${creator.id}/photos/${fileNameHash}`;

      // Upload the image to Supabase
      const { data, error } = await creatorStorage.upload(path, imageFile, {
        cacheControl: "3600",
        upsert: true,
      });

      if (error) {
        throw new Error(error.message);
      }

      // Update the post with the new image path
      const updatedCoverImages = [...(post.coverImages || []), path];

      // Update post state
      setPost({
        ...post,
        coverImages: updatedCoverImages,
      });

      // Save to database
      await savePost(post, {
        coverImages: updatedCoverImages,
      });

      // Clear the image state
      setImageFile(null);
      setImagePreview(null);

      toast.success("Image uploaded successfully");
    } catch (error: any) {
      console.error("Error uploading image:", error);
      toast.error(`Failed to upload image: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = async (imagePath: string) => {
    if (!post) return;

    try {
      // Filter out the image to remove
      const updatedCoverImages = post.coverImages.filter(
        (img) => img !== imagePath
      );

      // Update post state
      setPost({
        ...post,
        coverImages: updatedCoverImages,
      });

      // Save to database
      await savePost(post, {
        coverImages: updatedCoverImages,
      });

      toast.success("Image removed successfully");
    } catch (error: any) {
      console.error("Error removing image:", error);
      toast.error(`Failed to remove image: ${error.message}`);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <Loading />
      </div>
    );
  }

  if (!clone) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <p>Clone not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-0">
      <div className="flex flex-col gap-2 overflow-y-auto max-h-[calc(100vh-200px)] pb-32">
        <h1 className="text-3xl font-bold">Content & Prompt</h1>
        <h3 className="text-lg text-muted-foreground mt-2">
          Edit the content and prompt for this clone
        </h3>
        <div className="space-y-2">
          <Label htmlFor="duration">Expected Duration</Label>
          <Select
            value={
              clone.expectedDurationMs
                ? clone.expectedDurationMs.toString()
                : "15"
            }
            onValueChange={handleDurationChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select duration" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15">15 minutes</SelectItem>
              <SelectItem value="30">30 minutes</SelectItem>
              <SelectItem value="45">45 minutes</SelectItem>
              <SelectItem value="60">60 minutes</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col space-y-4/">
          <div className="space-y-2">
            <Label>Welcome Message</Label>
            {clone.postId && prompt ? (
              <Input
                value={welcomeMessage}
                onChange={(e) => handleWelcomeMessageChange(e.target.value)}
                onBlur={handleWelcomeMessageBlur}
                placeholder="Enter welcome message..."
              />
            ) : (
              <div className="text-muted-foreground text-center py-4">
                <p>No welcome message set</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Post</Label>
            <div className="border rounded-md p-4 min-h-[200px] bg-background">
              {clone.postId && post ? (
                <>
                  <h1 className="text-xl font-bold">{post.title}</h1>
                  <div className="mt-4 prose max-w-none">
                    <RichTextEditor
                      content={post.overview}
                      onChange={(newContent) =>
                        handlePostChange({ overview: newContent })
                      }
                      readOnly={false}
                    />
                  </div>
                </>
              ) : (
                <div className="text-muted-foreground text-center py-12">
                  <p>No content selected</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => setCreatePostDialogOpen(true)}
                  >
                    Create New Post
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Prompt</Label>
            <div className="border rounded-md p-4 min-h-[200px] bg-background">
              <div className="prose max-w-none">
                {clone.postId && post?.prompt ? (
                  <textarea
                    className="w-full h-[200px] font-mono text-sm p-2 bg-transparent border-none focus:outline-none focus:ring-0 resize-none"
                    value={promptContent}
                    onChange={(e) => handlePromptContentChange(e.target.value)}
                    onBlur={handlePromptContentBlur}
                    placeholder="Enter prompt content..."
                  />
                ) : (
                  <div className="text-muted-foreground text-center py-12">
                    <p>No prompt associated with this content</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() =>
                        router.push(`/hub/posts/${post?.id}/editor`)
                      }
                    >
                      Edit Post & Prompt
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Image Upload Section */}
          <div className="space-y-2">
            <Label>Cover Image</Label>
            <div className="border rounded-md p-4 bg-background">
              {clone.postId && post ? (
                <div className="space-y-4">
                  {/* Display existing images */}
                  {post.coverImages && post.coverImages.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                      {post.coverImages.map((imagePath, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={imagePath}
                            alt={`Cover image ${index + 1}`}
                            className="w-full h-32 object-cover rounded-md"
                          />
                          <button
                            onClick={() => removeImage(imagePath)}
                            className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove image"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Image upload form */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="flex-1"
                      />
                      <Button
                        onClick={handleImageUpload}
                        disabled={!imageFile || isUploading}
                        className="whitespace-nowrap"
                      >
                        {isUploading ? "Uploading..." : "Upload Image"}
                        {!isUploading && <Upload size={16} className="ml-2" />}
                      </Button>
                    </div>

                    {/* Image preview */}
                    {imagePreview && (
                      <div className="mt-2">
                        <p className="text-sm text-muted-foreground mb-1">
                          Preview:
                        </p>
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="max-h-40 rounded-md"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-muted-foreground text-center py-8">
                  <Image className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2">Create a post first to add images</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
