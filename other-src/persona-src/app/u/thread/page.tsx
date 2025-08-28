import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import ThreadList from "./ThreadList";
import Header from "@/components/Header/Header";

export default async function AskNotePage() {
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

  let creator = await prisma.creator.findUnique({
    where: {
      id: user?.id,
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

  if (!creator) {
    throw new Error("Creator not found");
  }
  return (
    <>
      <Header title="Threads" />
      <ThreadList />
    </>
  );
}
