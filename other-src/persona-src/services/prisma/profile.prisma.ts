import prisma from "@/lib/prisma";

export async function createProfile(data: any) {
  return await prisma.profile.create({
    data,
  });
}
