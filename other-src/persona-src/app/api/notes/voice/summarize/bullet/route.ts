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

    const prompt = `Summarize the following transcript into concise bullet points:\n\n${fullText}\n\nBullet points:`;

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: `You are an expert in summarizing transcripts into concise bullet points. 
          The transcript is a recording of a voice note about a person's daily activities.
          Create 3-7 bullet points that capture the main ideas and activities mentioned.
          Each bullet point should be a short, complete sentence.
          Start each bullet point with a dash (-) followed by a space.`,
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 150,
      n: 1,
      stop: null,
      temperature: 0.3,
    });

    const bulletPoints = response.choices?.[0]?.message?.content?.trim();

    return NextResponse.json({ bulletPoints }, { status: 200 });
  } catch (error) {
    console.error("Error summarizing transcript:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
