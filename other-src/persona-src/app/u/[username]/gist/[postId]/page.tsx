import React from "react";
import { useParams } from "next/navigation";
import { Post, Creator } from "@/types";
import GistPage from "./GistPage";
import prisma from "@/lib/prisma";
import { AnimatePresence } from "framer-motion";
import { Metadata, ResolvingMetadata } from "next/types";
import BackButton from "@/components/BackButton";
import { updateProfileImageWithSignedUrl } from "@/lib/profile";

export async function generateMetadata(
  { params }: { params: { username: string; postId: string } },
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { postId, username } = params;

  // Fetch the post and profile data (reusing your existing queries)
  const post = await prisma.post.findUnique({
    where: { id: parseInt(postId) },
  });

  const profile = await prisma.creator.findUnique({
    where: { username: username },
    select: {
      display_name: true,
      Profile: {
        select: {
          profileImage: true,
        },
      },
    },
  });

  // fetch image from supabase storage
  await updateProfileImageWithSignedUrl(profile?.Profile[0]);

  // Fallback values if data isn't found
  const title = post?.title || "Persona Story";
  const description = post?.summary || "View this Persona Story";
  // TODO: add default images.
  const image =
    post?.coverImages && post?.coverImages[0]
      ? post.coverImages[0]
      : "/default-image.jpg";

  return {
    title: `${title} by ${profile?.display_name || username}`,
    description: description,
    openGraph: {
      title: `${title} by ${profile?.display_name || username}`,
      description: description,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      type: "article",
      siteName: "Persona",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} by ${profile?.display_name || username}`,
      description: description,
      images: [image],
      site: "@persona",
      creator: "@persona",
    },
  };
}

export default async function Gist({
  params,
}: {
  params: { username: string; postId: string };
}) {
  const { postId, username } = params;

  // This is a server component.
  // use prisma to fetch the post
  const post = await prisma.post.findUnique({
    where: {
      id: parseInt(postId),
    },
  });

  // Fetch profile from prisma db
  const profile = await prisma.creator.findUnique({
    where: {
      username: username,
    },
    select: {
      id: true,
      username: true,
      email: true,
      display_name: true,
      Profile: {
        select: {
          initialQuestions: true,
          profileImage: true,
        },
      },
    },
  });

  // fetch image from supabase storage
  await updateProfileImageWithSignedUrl(profile?.Profile[0]);

  if (!profile) {
    throw new Error("Profile not found");
  }

  const userProfile = profile.Profile[0];

  if (!userProfile) {
    return <div>User Profile not found</div>;
  }

  if (!post) {
    return <div>Post not found</div>;
  }

  const creator = {
    id: profile.id,
    username: profile.username,
    display_name: profile.display_name,
    email: profile.email,
    image: profile.Profile[0].profileImage,
  } as Creator;

  return (
    <>
      <header className="flex flex-row justify-start w-full px-4">
        <BackButton url={`/u/${username}`} />
      </header>
      <AnimatePresence mode="wait">
        <GistPage post={post} creator={creator} />
      </AnimatePresence>
    </>
  );
}
