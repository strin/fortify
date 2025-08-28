import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { fullText } = await request.json();

    if (!fullText) {
      return NextResponse.json(
        { error: "Missing fullText in request body" },
        { status: 400 }
      );
    }

    const prompt = `Summarize the following transcript into a concise title:\n\n${fullText}\n\nTitle:`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert in summarizing transcripts into concise titles. 
          The transcript is a recording of a voice note about a person's daily activities.
          The title should preserve information about the activity.
          Your title should be no more than 10 words, and show only capitalize the first word.
          You should not include quotes in the title.`,
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 60,
      n: 1,
      stop: null,
      temperature: 0.3,
    });

    const title = response.choices?.[0]?.message?.content?.trim();

    return NextResponse.json({ title }, { status: 200 });
  } catch (error) {
    console.error("Error summarizing transcript:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
