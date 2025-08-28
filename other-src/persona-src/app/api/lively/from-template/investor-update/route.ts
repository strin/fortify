import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import OpenAI from "openai";

const prisma = new PrismaClient();
const openai = new OpenAI();

export async function POST(request: Request) {
  try {
    const { content, creatorId } = await request.json();

    if (!content || !creatorId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create a Post to go with the SlideDeck
    const postPrompt = await prisma.prompt.create({
      data: {
        creatorId: creatorId,
        content: `You are an AI assistant helping walk through a slide deck presentation. Your role is to:

1. Guide the user through each slide naturally and conversationally
2. Explain the key points on each slide clearly and engagingly
3. Answer any questions about the content
4. Keep the conversation focused on the slide deck material
5. Maintain a professional but friendly tone

For each slide:
- Start by introducing the slide topic
- Walk through the main points
- Provide relevant context and explanations
- Invite questions before moving to the next slide

Remember to:
- Be concise but thorough
- Use natural conversational language
- Stay on topic
- Be encouraging and supportive
- Acknowledge user questions and provide clear answers

The slide deck contains important information - help the user understand and engage with the material effectively.
`,
        welcomeMessage: "Welcome to the email update.",
      },
    });

    const post = await prisma.post.create({
      data: {
        creatorId: creatorId,
        title: "Email Update",
        summary: "This is a slide to walk you through the email update.",
        overview: "This is a slide to walk you through the email update.",
        promptId: postPrompt.id,
      },
    });

    // Create a new SlideDeck
    const slideDeck = await prisma.slideDeck.create({
      data: {
        creatorId: creatorId,
        title: "Investor Update",
        postId: post.id,
      },
    });

    // Use ChatGPT to break down content into slides
    const prompt = `Based on this investor update, create a scripted video presentation with at least 3 slides. Create script for each slide. Format the response as a JSON object where the field "slides" is an array of items.
    Each item has a 'markdown' property containing the slide content.
    In addition to the markdown, each slide should have:
    1. a 'title' property containing the title of the slide
    2. a 'script' property containing the script the speaker will narrate for the slide.
    3. a 'context' property containing the context for the LLM to answer questions about the slide.

The investor update content is:
${content}`;

    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-4o",
      response_format: { type: "json_object" },
    });

    console.log("openai completion", completion.choices);

    const slides = JSON.parse(completion.choices[0].message.content || "{}")
      .slides as {
      markdown: string;
      title: string;
      script: string;
      context: string;
    }[];

    console.log("slides", slides);

    // Create DeckMarkdownSlides for each slide
    await Promise.all(
      slides.map(
        async (
          slide: {
            markdown: string;
            title: string;
            script: string;
            context: string;
          },
          index: number
        ) => {
          await prisma.deckMarkdownSlide.create({
            data: {
              slideDeckId: slideDeck.id,
              markdown: slide.markdown,
              order: index,
              title: slide.title,
              script: slide.script,
              context: slide.context,
            },
          });
        }
      )
    );

    return NextResponse.json({
      success: true,
      slideDeckId: slideDeck.id,
    });
  } catch (error) {
    console.error("Error processing investor update:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
