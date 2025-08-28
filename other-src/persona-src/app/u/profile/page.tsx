import React from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options"; // Adjust the import path as needed
import ProfilePage from "@/app/u/[username]/ProfilePage";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { Profile, SessionUser } from "@/types";

interface SessionUserTypes extends SessionUser {
  Profile: Profile[];
}

export default async function UserHome() {
  const session = await getServerSession(authOptions);
  let user = null as SessionUserTypes | null | undefined;

  if (session) {
    user = session.user as SessionUserTypes;
  }

  if (user && !isNaN(user.id)) {
    user.id = Number(user.id);
  }

  if (!user) {
    redirect("/login");
  }

  const creator = await prisma.creator.findUnique({
    where: {
      id: user.id,
    },
    select: {
      username: true,
      display_name: true,
      Profile: {
        select: {
          initialQuestions: true,
          profileImage: true,
        },
      },
    },
  });

  if (creator?.Profile) {
    user.Profile = creator.Profile;
  }

  if (creator?.username) {
    user.username = creator.username;
  }

  return <ProfilePage creator={user} user={user} />;
}
