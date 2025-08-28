import React from "react";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options"; // Adjust the import path as needed
import ProfilePage from "@/app/u/[username]/ProfilePage";
import { Metadata, ResolvingMetadata } from "next/types";
import BackButton from "@/components/BackButton";
import { redirect } from "next/navigation";
import { updateProfileImageWithSignedUrl } from "@/lib/profile";

// Add this type and generateMetadata function before the UserHome component
type Props = {
  params: { username: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const creator = await prisma.creator.findUnique({
    where: {
      username: params.username,
    },
    select: {
      display_name: true,
      Profile: {
        select: {
          profileImage: true,
        },
      },
    },
  });

  return {
    title: creator?.display_name || params.username,
    description: `Check out ${
      creator?.display_name || params.username
    }'s profile`,
    openGraph: {
      title: creator?.display_name || params.username,
      description: `Check out ${
        creator?.display_name || params.username
      }'s profile`,
      images:
        creator?.Profile && creator.Profile[0]?.profileImage
          ? [creator.Profile[0].profileImage]
          : [],
    },
    twitter: {
      card: "summary_large_image",
      title: creator?.display_name || params.username,
      description: `Check out ${
        creator?.display_name || params.username
      }'s profile`,
      images:
        creator?.Profile && creator.Profile[0]?.profileImage
          ? [creator.Profile[0].profileImage]
          : [],
    },
  };
}

export default async function UserHome({
  params,
  searchParams,
}: {
  params: { username: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const { username } = params;
  // Fetch profile from prisma db
  const creator = await prisma.creator.findUnique({
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
      followers: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!creator) {
    console.error("Profile not found, redirecting to /u");
    redirect("/u");
  }

  if (!creator.username) {
    throw new Error("Username not found");
  }

  await updateProfileImageWithSignedUrl(creator.Profile[0]);

  const session = await getServerSession(authOptions);
  interface SessionUser {
    id: number;
    name: string;
    username: string;
    email: string;
    image: string;
    display_name: string;
  }
  let user = null as SessionUser | null | undefined;
  if (session) {
    user = session.user as SessionUser;
  }

  if (!user) {
    redirect("/login");
  }

  console.log("profile page user", user);

  return <ProfilePage creator={creator} user={user} />;
}
