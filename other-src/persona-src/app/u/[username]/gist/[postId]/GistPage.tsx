"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Share } from "lucide-react";
import { toast } from "sonner";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";
import { PageSlideIn } from "@/lib/motion";

import { Post, Creator } from "@/types";

export default function GistPage({
  post,
  creator,
}: {
  post: Post;
  creator: Creator;
}) {
  console.log("post", post);
  console.log("creator", creator);

  const { username, postId } = useParams();
  const postedAgo = formatDistanceToNow(new Date(post.createdAt), {
    addSuffix: true,
  });

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Story link has been copied!");
  };

  return (
    <PageSlideIn className="w-full h-full max-w-3xl mx-auto p-2 rounded-lg shadow-md text-white space-y-1 bg-background px-4 flex flex-col">
      <div className="flex flex-col justify-start max-h-[calc(100vh-12rem)] overflow-scroll flex-grow">
        <div className="flex justify-between items-start mb-4">
          <h1 className="text-3xl font-bold text-white">{post.title}</h1>
          <Button
            onClick={handleShare}
            variant="ghost"
            className="text-gray-400 hover:text-white hover:bg-gray-800 transition-colors flex items-center"
          >
            <Share className="h-5 w-5" />
          </Button>
        </div>

        <div className="mb-4 text-sm text-gray-400">
          Posted by {creator.username} {postedAgo}
        </div>

        {post.coverImages && post.coverImages.length > 0 && (
          <div className="mb-6 w-full">
            <Carousel>
              <CarouselContent>
                {post.coverImages.map((image, index) => (
                  <CarouselItem key={index}>
                    <Image
                      src={image}
                      alt={`Cover image ${index + 1}`}
                      width={800}
                      height={400}
                      className="rounded-lg object-cover"
                      style={{ maxHeight: "400px" }}
                      unoptimized={image.includes("substackcdn.com")}
                    />
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="absolute top-1/2 left-4 transform -translate-y-1/2 text-black bg-opacity-40" />
              <CarouselNext className="absolute top-1/2 right-4 transform -translate-y-1/2 text-black bg-opacity-40" />
            </Carousel>
          </div>
        )}

        <div className="prose prose-invert max-w-none mb-8">
          <ReactMarkdown
            components={{
              img: ({ node, ...props }) => (
                <Image
                  {...props}
                  src={props.src || ""}
                  alt={props.alt || ""}
                  width={800}
                  height={400}
                  className="rounded-lg object-cover"
                  unoptimized={props.src?.includes("substackcdn.com")}
                />
              ),
              a: ({ node, ...props }) => (
                <a
                  {...props}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300"
                />
              ),
              p: ({ node, ...props }) => (
                <p {...props} className="text-white leading-relaxed mb-4" />
              ),
            }}
          >
            {post.overview}
          </ReactMarkdown>
        </div>
      </div>

      <Link href={`/c/${username}/${postId}`} passHref prefetch={true}>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full">
          Start the Conversation
        </Button>
      </Link>
    </PageSlideIn>
  );
}
