import useCreator from "@/lib/creator";
import CloneMeetingsView from "./CloneMeetingsView";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";

export default async function CloneMeetingsPage({
  params,
}: {
  params: { slug: string };
}) {
  const creator = await useCreator();

  // Fetch the clone to ensure it exists and belongs to this creator
  const clone = await prisma.clone.findFirst({
    where: {
      slug: params.slug,
      creatorId: creator.id,
    },
  });

  // If clone doesn't exist or doesn't belong to this creator, redirect
  if (!clone) {
    redirect("/u/clones");
  }

  return <CloneMeetingsView creator={creator} cloneSlug={params.slug} />;
}
