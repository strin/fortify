import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import MemoPage from "./MemoPage";
import { Creator } from "@/types";

export default async function MemosPage() {
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

  return <MemoPage creator={creator} />;
}
