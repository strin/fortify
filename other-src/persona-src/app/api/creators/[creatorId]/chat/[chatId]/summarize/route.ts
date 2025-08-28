import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import OpenAI from "openai";
import { SpeakerRole } from "@prisma/client";

export const maxDuration = 300;

export async function POST(
  request: Request,
  { params }: { params: { creatorId: string; chatId: string } }
) {
  try {
    console.log("Summarizing chat", params.chatId);
    // Get chat with messages
    console.time("fetch-chat");
    const chat = await prisma.chat.findUnique({
      where: {
        id: parseInt(params.chatId),
      },
      include: {
        post: {
          select: {
            title: true,
            overview: true,
          },
        },
        user: {
          select: {
            display_name: true,
          },
        },
        creator: {
          select: {
            display_name: true,
          },
        },
        messages: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });
    console.timeEnd("fetch-chat");
    console.log("Retrieved chat", chat);

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    console.log("Calling OpenAI API to generate summary");
    console.time("generate-summary");

    // Create summary from messages
    let transcript = "";
    let assistantName = "ASSISTANT";
    let userName = "USER";

    if (chat.post?.title) {
      transcript += `## Post Title\n${chat.post?.title}\n\n`;
    }
    if (chat.post?.overview) {
      transcript += `## Post Overview\n${chat.post?.overview}\n\n`;
    }
    if (chat.user?.display_name) {
      transcript += `## USER\n${chat.user?.display_name}\n\n`;
      userName = chat.user?.display_name;
    }
    if (chat.creator?.display_name) {
      transcript += `## ASSISTANT\n${chat.creator?.display_name}\n\n`;
      assistantName = chat.creator?.display_name;
    }
    transcript += chat.messages.reduce((acc, message) => {
      return (
        acc +
        `${message.role === SpeakerRole.USER ? userName : assistantName}: ${
          message.content
        }\n`
      );
    }, "");
    // Call OpenAI API to generate summary
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    console.log("Transcript", transcript);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert in summarizing transcripts into concise bullet points. 
          First, create bullet points that capture the main conversation flow and ideas.
          Each bullet point should be a short, complete sentence.
          Start each bullet point with a dash (-) followed by a space. 
          Use ${userName} and ${assistantName} to identify who is speaking.

          Then, create a list of memories and facts about the user.
          Each memory or fact should be a short, complete sentence.

          Format as:

          ## Chat Summary
          - ...
          - ...
          - ...

          ## Memories about the user
          - ...
          - ...
          
          `,
        },
        {
          role: "user",
          content: transcript,
        },
      ],
      temperature: 0,
      max_tokens: 2000,
    });

    const summary = completion.choices[0].message.content;

    // Add another GPT call to generate title
    const titleCompletion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert in summarizing transcripts into concise titles.
          Create a title that captures the main conversation flow and ideas.
          The title should be a short, complete sentence. It should not having quotes around it.
          `,
        },
        {
          role: "user",
          content: transcript,
        },
      ],
    });

    const title = titleCompletion.choices[0].message.content;
    // Remove quotes if present from the title
    const cleanTitle = title?.replace(/^["'](.*)["']$/, "$1");

    // Update chat with summary
    const updatedChat = await prisma.chat.update({
      where: {
        id: parseInt(params.chatId),
      },
      data: {
        summary,
        title: cleanTitle,
      },
    });
    console.timeEnd("generate-summary");

    return NextResponse.json({
      summary: updatedChat.summary,
      title: updatedChat.title,
    });
  } catch (error) {
    console.error("Error summarizing chat:", error);
    return NextResponse.json(
      { error: "Failed to summarize chat" },
      { status: 500 }
    );
  }
}
