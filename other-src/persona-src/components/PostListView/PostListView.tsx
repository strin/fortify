"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Post } from "@/types";
import ReactMarkdown from "react-markdown";
import Link from "next/link";
import { Skeleton } from "../ui/skeleton";
import { Plus } from "lucide-react";
import UploadStory from "../UploadStory/UploadStory";

const PostListView: React.FC<{
  creatorId: number;
  userId: number | null;
  username: string;
}> = ({ creatorId, userId, username }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadStoryOpen, setUploadStoryOpen] = useState(false);

  useEffect(() => {
    const fetchPosts = async () => {
      const response = await fetch(`/api/posts?creatorId=${creatorId}`);
      const data = await response.json();
      setPosts(data);
      setLoading(false);
    };

    fetchPosts();
  }, [creatorId]);

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <div className="animate-pulse space-y-4">
          <Skeleton className="h-24 bg-gray-900 rounded-md" />
          <Skeleton className="h-24 bg-gray-900 rounded-md" />
          <Skeleton className="h-24 bg-gray-900 rounded-md" />
        </div>
      </div>
    );
  }

  const allowUpload = userId === creatorId;

  console.log("posts", posts);

  return (
    <div className="space-y-4 bg-background text-foreground overflow-y-scroll pb-8">
      {allowUpload && (
        <>
          <Card
            className="cursor-pointer border-4 border-dashed border-blue-400/30 bg-transparent hover:bg-gray-900/20 transition-colors duration-200 px-4 my-2 rounded-lg"
            onClick={() => setUploadStoryOpen(true)}
          >
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-blue-400 text-md flex items-center">
                  <Plus className="w-5 h-5 mr-2" />
                  Upload New Story
                </CardTitle>
              </div>
              <CardDescription className="mt-2 text-gray-400">
                Click to create a new story
              </CardDescription>
            </CardHeader>
          </Card>
          <UploadStory
            creatorId={creatorId}
            open={uploadStoryOpen}
            onOpenChange={setUploadStoryOpen}
            onComplete={() => {}}
          />
        </>
      )}
      {posts.map((post) => (
        <Link
          key={post.id}
          href={`/u/${username}/gist/${post.id}`}
          className="block"
          prefetch={true}
        >
          <Card className="cursor-pointer border-none bg-gray-900 hover:bg-gray-800 transition-colors duration-200 my-2 rounded-lg">
            <CardHeader className="flex flex-row gap-4 p-1 min-h-[100px]">
              {post.coverImages && post.coverImages[0] && (
                <div className="flex-shrink-0 h-[100px] w-[100px] overflow-hidden rounded-md">
                  <img
                    src={post.coverImages[0]}
                    alt={post.title}
                    width={100}
                    height={100}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div
                className={`flex-1 ${!post.coverImages?.length ? "p-2" : ""}`}
              >
                <div className="flex justify-between items-center">
                  <CardTitle className="text-[#ffffff] text-md">
                    {post.title}
                  </CardTitle>
                  <CardDescription className="text-sm text-gray-400">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </CardDescription>
                </div>
                <CardDescription className="mt-2 text-gray-300 line-clamp-2">
                  {post.summary}
                </CardDescription>
              </div>
            </CardHeader>
          </Card>
        </Link>
      ))}
    </div>
  );
};

export default PostListView;
