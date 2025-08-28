import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { deleteFileIndex } from "@/lib/content-service";
export async function DELETE(
  request: Request,
  { params }: { params: { creatorId: string; linkid: string } }
) {
  try {
    await prisma.contentLink.delete({
      where: {
        id: parseInt(params.linkid),
      },
    });

    const path = `users/${params.creatorId}/links/${params.linkid}.md`;
    await deleteFileIndex(parseInt(params.creatorId), path);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting content link:", error);
    return NextResponse.json(
      { error: "Failed to delete content link" },
      { status: 500 }
    );
  }
}
