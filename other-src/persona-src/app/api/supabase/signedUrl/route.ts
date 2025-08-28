export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { creatorStorage } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const prefix = searchParams.get("prefix");

    if (!prefix) {
      return NextResponse.json(
        { error: "Missing prefix parameter" },
        { status: 400 }
      );
    }

    const { data, error } = await creatorStorage.createSignedUrl(prefix, 3600); // 1 hour expiration

    if (error) {
      throw error;
    }

    return NextResponse.json({ signedUrl: data.signedUrl }, { status: 200 });
  } catch (error) {
    console.error("Error creating signed URL:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
