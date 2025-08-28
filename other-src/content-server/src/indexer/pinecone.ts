import { Pinecone } from "@pinecone-database/pinecone";
import * as path from "path";
import { OpenAIEmbeddings } from "@langchain/openai";

import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { PineconeStore } from "@langchain/pinecone";
import { supabase } from "../store/supabase";
import { Document } from "@langchain/core/documents";
import { v4 as uuidv4 } from "uuid";

// Data loaders.
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";
import { IndexChatJobData } from "../workers";

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 4000,
  chunkOverlap: 200,
});

export const getDefaultIndexName = () => {
  return process.env.PINECONE_INDEX_NAME || "creators-serverless";
};

const PINECONE_API_ENV = process.env.PINECONE_API_ENV;
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;

if (!PINECONE_API_ENV) {
  console.error("PINECONE_API_ENV is not set");
  process.exit(1);
}

if (!PINECONE_API_KEY) {
  console.error("PINECONE_API_KEY is not set");
  process.exit(1);
}

export class PineconeIndexer {
  indexName: string;
  namespace: string;
  pineconeClient: Pinecone;

  constructor(indexName: string, namespace: string) {
    this.indexName = indexName;
    this.namespace = namespace;
    this.pineconeClient = new Pinecone({
      apiKey: PINECONE_API_KEY as string,
    });
  }

  async indexDocuments(
    indexName: string,
    docs: any[],
    splitDocs: boolean = true
  ) {
    const pineconeIndex = this.pineconeClient.Index(indexName);
    const visited = new Set();
    for (const doc of docs) {
      console.log("deleting doc", doc.metadata["source"], this.namespace);

      if (visited.has(doc.metadata["source"])) {
        continue;
      }

      try {
        while (true) {
          const listResponse = await pineconeIndex
            .namespace(this.namespace)
            .listPaginated({
              prefix: doc.metadata["source"],
            });
          console.log(
            "deleting vectors",
            listResponse.vectors?.map((v) => v.id)
          );
          if (!listResponse.vectors || listResponse.vectors.length === 0) {
            break;
          }
          await pineconeIndex
            .namespace(this.namespace)
            .deleteMany(listResponse.vectors.map((v) => v.id));
          await new Promise((resolve) => setTimeout(resolve, 1000)); // Sleep for 1s between batches
        }
        // // Serverless function does not allow delete based on metadata filtering..
        // await pineconeIndex.namespace(this.namespace).deleteMany({
        //   source: {
        //     $eq: doc.metadata["source"],
        //   },
        // });
      } catch (error: any) {
        if (error.response && error.response.status === 404) {
          console.log(
            `No documents found to delete for source: ${doc.metadata["source"]}`
          );
        } else {
          console.error(
            `Error deleting documents for source: ${doc.metadata["source"]}`,
            error
          );
        }
      }
      visited.add(doc.metadata["source"]);
    }
    let splittedDocs: any[] = [];
    if (splitDocs) {
      splittedDocs = await splitter.splitDocuments(docs);
    } else {
      splittedDocs = docs;
    }
    for (const doc of splittedDocs) {
      doc.id = `${doc.metadata["source"]}#${uuidv4().slice(0, 8)}`;
      if (doc.metadata["type"] === "vtt") {
        doc.pageContent = `*Transcript*\n` + doc.pageContent;
      }
      if (doc.metadata["header"]) {
        doc.pageContent =
          "*Header*\n" + doc.metadata["header"] + "\n\n" + doc.pageContent;
      }
      if (doc.metadata["filename"]) {
        doc.pageContent =
          "*Filename*\n" + doc.metadata["filename"] + "\n\n" + doc.pageContent;
      }
    }

    try {
      console.log("indexing documents", splittedDocs);
      const store = new PineconeStore(
        new OpenAIEmbeddings({
          modelName: "text-embedding-3-small",
        }),
        {
          pineconeIndex,
          namespace: this.namespace,
          textKey: "text",
        }
      );
      await store.addDocuments(splittedDocs, {
        ids: splittedDocs.map((d) => d.id || ""),
      });
    } catch (error: any) {
      console.error(
        `Error indexing documents for source: ${docs[0].metadata["source"]}`,
        error
      );
    }
  }

  async run(bucket: string, path: string) {
    const docs: any[] = [];
    const { data, error } = await supabase.storage.from(bucket).list(path);
    console.log("data", data, "bucket", bucket, "path", path);
    if (error) {
      console.error(error);
      return;
    }
    if (data.length > 0) {
      // This is a directory.
      console.log("Indexing a directory", path);
      await walkDirectory(bucket, path, docs);
    } else {
      console.log("Indexing a single file", path);
      const thisDocs = await loadDocuments(bucket, path);
      for (const doc of thisDocs) {
        docs.push(doc);
      }
    }

    console.log("Indexing total number of doc snippets", docs.length);
    if (docs.length > 0) {
      await this.indexDocuments(this.indexName, docs);
    }
  }

  async deleteFile(path: string) {
    console.log("Deleting file", path);
    const pineconeIndex = this.pineconeClient.Index(this.indexName);
    try {
      while (true) {
        const listResponse = await pineconeIndex
          .namespace(this.namespace)
          .listPaginated({
            prefix: path,
          });
        console.log(
          "deleting vectors",
          listResponse.vectors?.map((v) => v.id)
        );
        if (!listResponse.vectors || listResponse.vectors.length === 0) {
          break;
        }
        await pineconeIndex
          .namespace(this.namespace)
          .deleteMany(listResponse.vectors.map((v) => v.id));
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Sleep for 1s between batches
      }
    } catch (error: any) {
      console.error(`Error deleting vectors for ${path}:`, error);
    }
  }

  async deleteDocs(metadata: { id: number; type: string }) {
    // Try first way to delete vectors.
    const pineconeIndex = this.pineconeClient.Index(this.indexName);
    try {
      while (true) {
        const listResponse = await pineconeIndex
          .namespace(this.namespace)
          .listPaginated({
            prefix: `note-${metadata.type}-${metadata.id}`,
          });
        console.log(
          "deleting vectors",
          listResponse.vectors?.map((v) => v.id)
        );
        if (!listResponse.vectors || listResponse.vectors.length === 0) {
          break;
        }
        await pineconeIndex
          .namespace(this.namespace)
          .deleteMany(listResponse.vectors.map((v) => v.id));
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Sleep for 1s between batches
      }
    } catch (error: any) {
      console.error(
        `Error deleting vectors for note-${metadata.type}-${metadata.id}:`,
        error
      );
    }
    // Try second way to delete vectors.
    try {
      await this.pineconeClient
        .Index(this.indexName)
        .namespace(this.namespace)
        .deleteMany({
          source: {
            $eq: `note-${metadata.type}-${metadata.id}`,
          },
        });
    } catch (error: any) {
      console.error(
        `(Old way) Error deleting vectors for note-${metadata.type}-${metadata.id}:`,
        error
      );
    }
  }

  async runDocs(content: string, metadata: any) {
    console.log("indexing doc directly", content);
    // Create a Document directly instead of using TextLoader
    const doc = new Document({
      pageContent: content,
      metadata: {
        ...metadata,
        source: metadata.source || `note-${metadata.type}-${metadata.id}`,
        bucket: metadata.bucket || "default",
        createdAt: metadata.createdAt || new Date().toISOString(),
        type: metadata.type || "text",
        id: metadata.id,
      },
    });

    let pageContent = "";
    if (metadata.title) {
      pageContent += `Title: ${metadata.title}\n\n`;
    }
    if (metadata.createdAt) {
      pageContent += `Created: ${new Date(
        metadata.createdAt
      ).toISOString()}\n\n`;
    }
    doc.pageContent = pageContent + doc.pageContent;

    await this.indexDocuments(this.indexName, [doc]);
  }

  async runIndexChat({
    userId,
    creatorId,
    chatId,
    postId,
    summary,
  }: {
    userId: number;
    creatorId: number;
    chatId: number;
    postId: number | null;
    summary: string;
  }) {
    console.log("Indexing chat", {
      userId,
      creatorId,
      chatId,
      postId,
      summary,
    });

    // TODO: use proper date filtering based on user's timezone.

    const date = new Date();
    // Convert to Pacific time
    const pacificDate = new Date(
      date.toLocaleString("en-US", { timeZone: "America/Los_Angeles" })
    );
    const hours = pacificDate.getHours();
    const timeOfDay =
      hours < 12 ? "morning" : hours < 17 ? "afternoon" : "evening";
    const formattedDate = `${pacificDate.getFullYear()}-${String(
      pacificDate.getMonth() + 1
    ).padStart(2, "0")}-${String(pacificDate.getDate()).padStart(
      2,
      "0"
    )} ${timeOfDay}`;
    const pageContent = `*Summary of chat on ${formattedDate}*\n${summary}`;

    const doc = new Document({
      pageContent: pageContent,
      metadata: {
        userId,
        creatorId,
        chatId,
        postId,
        id: chatId,
        source: `chat-${chatId}`, // source is used to identify unique content and remove duplicates for re-indexing.
        datetime: new Date().toISOString(),
      },
    });

    await this.indexDocuments(this.indexName, [doc], false);
  }
}

async function loadDocuments(bucket: string, path: string) {
  const { data, error } = await supabase.storage.from(bucket).download(path);
  let docs: any[] = [];

  if (error) {
    console.error("Cannot download document", error);
    return [];
  }
  if (
    data.type.startsWith("text/plain") ||
    data.type.startsWith("text/html") ||
    data.type.startsWith("application/json") ||
    data.type.startsWith("application/octet-stream") ||
    data.type.startsWith("text/markdown")
  ) {
    // TODO: markdown files seem to be 'application/octet-stream'.
    const loader = new TextLoader(data);
    docs = await loader.load();
    const slug = path.split("/").pop();
    for (const doc of docs) {
      doc.metadata["source"] = path;
      doc.metadata["bucket"] = bucket;
      doc.metadata["type"] = "text";
      doc.metadata["slug"] = slug;
      doc.metadata["filename"] = slug;
    }
  } else if (data.type.startsWith("text/vtt")) {
    const loader = new TextLoader(data);
    docs = await loader.load();
    const slug = path.split("/").pop();

    for (const doc of docs) {
      const parts = doc.pageContent.split("---");
      if (parts.length > 1) {
        const header = parts[0].trim();
        doc.metadata["header"] = header;
        doc.pageContent = parts.slice(1).join("---");
      }
      doc.metadata["filename"] = slug;
      doc.metadata["source"] = path;
      doc.metadata["bucket"] = bucket;
      doc.metadata["type"] = "vtt";
      // Remove VTT timestamps from pageContent
      doc.pageContent = doc.pageContent.replace(
        /^\d+\n\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}\n/gm,
        ""
      );
      doc.pageContent = doc.pageContent.trim();
    }
  } else if (data.type.startsWith("application/pdf")) {
    const loader = new PDFLoader(data);
    docs = await loader.load();
    for (const doc of docs) {
      doc.metadata["source"] = path;
      doc.metadata["bucket"] = bucket;
      doc.metadata["type"] = "pdf";
    }
  } else if (
    data.type ==
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const loader = new DocxLoader(data);
    docs = await loader.load();
    for (const doc of docs) {
      doc.metadata["source"] = path;
      doc.metadata["bucket"] = bucket;
      doc.metadata["type"] = "docx";
    }
  } else {
    console.error("unsupported file type", data.type, path);
  }

  console.log("loading documents", data);
  return docs;
}

export async function walkDirectory(
  bucket: string,
  dir: string,
  docs: any[] = []
) {
  console.log("walking", dir);
  const { data, error } = await supabase.storage.from(bucket).list(dir);
  if (error) {
    console.error(error);
    return;
  }

  const files = data || [];
  console.log("data", data);

  for (const file of files) {
    const filePath = path.join(dir, file.name);
    const isDirectory = file.id === null;

    if (isDirectory) {
      await walkDirectory(bucket, filePath, docs); // Recursively walk through subdirectories
    } else {
      console.log(filePath); // Display the file path
      const thisDocs = await loadDocuments(bucket, filePath);
      for (const doc of thisDocs) {
        console.log("creating document", filePath);
        docs.push(doc);
      }
    }
  }
}
