import VoiceNote from "./VoiceNote";
import prisma from "@/lib/prisma";

export default async function NotePage() {
  // fetch creatorId = 3
  const creator = await prisma.creator.findUnique({
    where: {
      id: 3,
    },
  });
  if (!creator) return null;

  return <VoiceNote creator={creator} />;
}
