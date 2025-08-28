import React from "react";
import LiveCall from "@/components/LiveCall/LiveCall";
import { Post, Creator } from "@/types";
import prisma from "@/lib/prisma";
import { AnimatePresence } from "framer-motion";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { SessionUser } from "@/types";
import { updateProfileImageWithSignedUrl } from "@/lib/profile";
import HeaderNavigation from "@/app/c/components/HeaderNavigation";

export default async function CallPage({
  params,
}: {
  params: { username: string; postId: string };
}) {
  const { postId, username } = params;

  // This is a server component.
  // use prisma to fetch the post
  let post: Post;
  if (postId === "-1") {
    post = {
      id: -1,
      title: "Default Post",
      overview: "This is the default post",
      promptId: 2,
    } as Post;
  } else {
    const postFromDb = await prisma.post.findUnique({
      where: {
        id: parseInt(postId),
      },
    });

    if (!postFromDb) {
      return <div>Post not found</div>;
    }

    post = postFromDb;
  }

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

  if (!profile) {
    throw new Error("Profile not found");
  }

  await updateProfileImageWithSignedUrl(profile.Profile[0]);

  const userProfile = profile.Profile[0];

  if (!userProfile) {
    return <div>User Profile not found</div>;
  }

  const creator = {
    id: profile.id,
    username: profile.username,
    display_name: profile.display_name,
    email: profile.email,
    image: profile.Profile[0].profileImage,
  } as Creator;

  // TODO: refactor this into a shared module.
  const session = await getServerSession(authOptions);
  let user = null as SessionUser | null;
  if (session) {
    user = session.user as SessionUser;
  }

  return (
    <div className="bg-background h-full w-full max-w-2xl flex flex-col justify-center items-center">
      <HeaderNavigation />
      <AnimatePresence mode="wait">
        <LiveCall
          profile={userProfile}
          post={post}
          creator={creator}
          user={user}
        />
      </AnimatePresence>
    </div>
  );
}
