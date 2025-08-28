import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { Creator } from "@/types";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";

const useCreator = async () => {
  const session = (await getServerSession(authOptions)) as { user: Creator };

  if (!session) {
    console.log("Not logged in");
    redirect("/login");
  }

  let { user } = session;

  // instead of encoding all these attributes in the JWT.
  // we fetch it during SSR.
  // so that user doesn't have to login again when these attributes change.
  //const additionalAttribtes = await prisma.creator.findUnique({
  //  where: {
  //    id: creator.id,
  //  },
  //});

  return user;
};

const useUser = useCreator;

export default useUser;
