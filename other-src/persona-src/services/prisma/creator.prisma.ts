import prisma from "@/lib/prisma";

export async function createCreator(data: any) {
    return await prisma.creator.create({
        data,
    });
}

export async function getCreatorById(id: number) {
    return await prisma.creator.findUnique({
        where: { id },
    });
}

export async function getCreatorByEmail(username: string) {
    return await prisma.creator.findUnique({
        where: { username },
        include: {
            Profile: true
        }
    });
}

export async function updateCreator(id: any, data: any) {
    return await prisma.creator.update({
        where: { id },
        data,
    });
}
