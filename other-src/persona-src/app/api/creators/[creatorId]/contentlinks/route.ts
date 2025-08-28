import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import FirecrawlApp, { ScrapeResponse } from "@mendable/firecrawl-js";
import { creatorStorage } from "@/lib/supabase";
import { updateIndex } from "@/lib/content-service";

const app = new FirecrawlApp({
  apiKey: process.env.FIRECRAWL_API_KEY,
});

export async function GET(
  request: Request,
  { params }: { params: { creatorId: string } }
) {
  try {
    const contentLinks = await prisma.contentLink.findMany({
      where: {
        creatorId: parseInt(params.creatorId),
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(contentLinks);
  } catch (error) {
    console.error("Error fetching content links:", error);
    return NextResponse.json(
      { error: "Failed to fetch content links" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { creatorId: string } }
) {
  const body = await request.json();
  const { url } = body;

  const contentLink = await prisma.contentLink.create({
    data: { url, creatorId: parseInt(params.creatorId) },
  });

  // Fire and forget the scraping process
  try {
    const scrapeResult = await app.scrapeUrl(url);
    console.log("scrapeResult", scrapeResult);

    const markdown = (scrapeResult as ScrapeResponse).markdown;
    if (!markdown) {
      console.error(
        `No markdown found in scrape result for url ${url}. Skipping upload.`
      );
      return;
    }

    const path = `users/${params.creatorId}/links/${contentLink.id}.md`;

    const { error } = await creatorStorage.upload(path, markdown, {
      contentType: "text/markdown",
      upsert: true,
    });

    if (error) {
      console.error("Error uploading markdown to Supabase:", error);
    }

    await updateIndex(parseInt(params.creatorId), path);
  } catch (error) {
    console.error("Scraping error:", error);
  }

  // Return immediately without waiting for scrape
  return NextResponse.json(contentLink);
}
