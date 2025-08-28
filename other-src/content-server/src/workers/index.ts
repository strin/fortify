import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { Worker, Job } from "bullmq";
import { redisConnection } from "../redis";
import { PineconeIndexer } from "../indexer/pinecone";

export interface IndexJobData {
  indexName: string;
  namespace: string;
  bucket: string;
  path: string;
}

export interface IndexTextNoteJobData {
  indexName: string;
  namespace: string;
  content: string;
  title: string;
  creatorId: number;
  createdAt: string;
  type: "text" | "voice";
  id: number;
}

export interface IndexChatJobData {
  indexName: string;
  namespace: string;
  creatorId: number;
  chatId: number;
  userId: number;
  postId: number;
  summary: string;
}

export interface DeleteNoteIndexJobData {
  indexName: string;
  namespace: string;
  noteId: number;
  type: "text" | "voice";
}

export interface DeleteFileJobData {
  indexName: string;
  namespace: string;
  path: string;
}

const worker = new Worker(
  "jobs",
  async (job: Job) => {
    console.log("Job name", job.name);
    if (job.name === "index") {
      const data = job.data as IndexJobData;
      console.log("Started indexing job", data);

      const indexer = new PineconeIndexer(data.indexName, data.namespace);
      await indexer.run(data.bucket, data.path);
    } else if (job.name === "indexTextNote") {
      const data = job.data as IndexTextNoteJobData;
      console.log("Started indexing text note job", data);
      const indexer = new PineconeIndexer(data.indexName, data.namespace);
      await indexer.runDocs(data.content, data);
    } else if (job.name === "deleteNoteIndex") {
      const data = job.data as DeleteNoteIndexJobData;
      console.log("Started deleting note index job", data);
      const indexer = new PineconeIndexer(data.indexName, data.namespace);
      await indexer.deleteDocs({ id: data.noteId, type: data.type });
    } else if (job.name === "indexChat") {
      const data = job.data as IndexChatJobData;
      console.log("Started indexing chat job", data);
      const indexer = new PineconeIndexer(data.indexName, data.namespace);
      await indexer.runIndexChat({
        userId: data.userId,
        creatorId: data.creatorId,
        chatId: data.chatId,
        postId: data.postId,
        summary: data.summary,
      });
    } else if (job.name === "deleteFile") {
      const data = job.data as DeleteFileJobData;
      console.log("Started deleting file job", data);
      const indexer = new PineconeIndexer(data.indexName, data.namespace);
      await indexer.deleteFile(data.path);
    }
  },
  { autorun: false, connection: redisConnection }
);

worker.on("completed", (job: Job) => {
  console.log(`Completed job ${job.id}`);
});

worker.on("failed", (job?: Job, error?: Error) => {
  // Do something with the return value.
  console.log(`Failed job ${job?.id} with error ${error?.message}`);
});

worker.run();
