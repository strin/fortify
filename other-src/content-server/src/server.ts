import dotenv from "dotenv";
import path from "path";
import fs from "fs";

const envPath = path.resolve(__dirname, ".env");

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log("Loaded environment variables from .env file");
} else {
  console.log(".env file not found, using existing environment variables");
}

import express, { Request, Response } from "express";
import { Queue } from "bullmq";
import { v4 as uuidv4 } from "uuid";
import { Destination, parseDestination, validateUrl } from "./types";
import { redisConnection } from "./redis";
import cors from "cors";
import { getDefaultIndexName } from "./indexer/pinecone";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: function (origin, callback) {
      callback(null, true);
    },
    credentials: true,
  })
);
app.use(cookieParser());
const port = process.env.PORT || 5001;

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET as string; // JWT secret.

if (!NEXTAUTH_SECRET) {
  throw new Error("NEXTAUTH_SECRET is not defined");
}

const jobQueue = new Queue("jobs", {
  connection: redisConnection,
});

function verifySession(req: Request, res: Response, next: any) {
  // Retrieve the JWT from the cookie
  const token = req.cookies["next-auth.session-token"];

  if (!token) {
    // If the token is missing, the session is invalid
    return res.status(401).json({ error: "Invalid session" });
  }

  try {
    // Verify and decode the JWT
    jwt.verify(token, NEXTAUTH_SECRET, (err: any, decodedToken: any) => {
      if (err) {
        return res.status(401).json({ error: "Invalid JWT token" });
      } else {
        console.log(decodedToken);
        //@ts-ignore
        req.session = decodedToken;
        next();
      }
    });
  } catch (err) {
    // If an error occurs during verification, the session is invalid
    return res.status(401).json({ error: "Invalid session" });
  }
}

app.put("/delete-file", (req: any, res: any) => {
  let userId = Number(req.body.userId);
  if (isNaN(userId) || !userId) {
    res.status(400).send("Invalid userId");
    return;
  }

  const { path } = req.body;
  if (!path) {
    res.status(400).send("Invalid path");
    return;
  }

  console.log("Deleting file", path);
  res.status(200).json({ message: "File deleted" });
  const jobId = uuidv4();
  jobQueue.add(
    "deleteFile",
    {
      indexName: getDefaultIndexName(),
      namespace: "creators/" + userId,
      path,
    },
    { jobId }
  );

  res.status(200).json({ message: "Job added to queue", jobId });
});

app.put("/jobs", (req: any, res: any) => {
  let userId = Number(req.body.userId);
  if (isNaN(userId) || !userId) {
    res.status(400).send("Invalid userId");
    return;
  }

  //  console.log("session", req.session);
  //  if (req.session.user.id !== userId) {
  //    res.status(401).send("Not authorized to run indexing for this user.");
  //    return;
  //  }

  let path = req.body.path;
  if (!path) {
    res.status(400).send("Invalid path");
    return;
  }

  let bucket = req.body.bucket;
  if (!bucket) {
    res.status(400).send("Invalid bucket");
    return;
  }

  const namespace = "creators" + "/" + userId;

  console.log("indexing path", path, "in namespace", namespace);
  const jobId = uuidv4();
  jobQueue.add(
    "index",
    {
      indexName: getDefaultIndexName(),
      namespace: namespace,
      bucket: bucket,
      path: path,
    },
    { jobId }
  );

  res.status(200).send({ jobId });
});

function getNoteNamespace(creatorId: number, isPublic: boolean) {
  let namespace = `users/${creatorId}`;
  if (!isPublic) {
    namespace += "/private";
  }
  return namespace;
}

app.put("/jobs/chat", (req: any, res: any) => {
  console.log("Indexing chat", req.body);
  res.status(200).json({ message: "Job added to queue" });

  const { creatorId, chatId, userId, postId, summary } = req.body;

  if (isNaN(creatorId) || !creatorId) {
    return res.status(400).json({ error: "Invalid creatorId" });
  }

  if (isNaN(userId) || !userId) {
    return res.status(400).json({ error: "Invalid userId" });
  }

  if (isNaN(chatId) || !chatId) {
    return res.status(400).json({ error: "Invalid chatId" });
  }

  jobQueue.add("indexChat", {
    indexName: getDefaultIndexName(),
    namespace: "users/" + userId + "/creators/" + creatorId + "/chat",
    creatorId,
    chatId,
    userId,
    postId,
    summary,
  });
});

app.put("/jobs/note", (req: any, res: any) => {
  const creatorId = Number(req.body.creatorId);
  if (isNaN(creatorId) || !creatorId) {
    return res.status(400).json({ error: "Invalid creatorId" });
  }

  const { content, title, createdAt, type, id, public: isPublic } = req.body;
  if (!type) {
    return res.status(400).json({ error: "Type is required" });
  }
  if (type !== "text" && type !== "voice") {
    return res.status(400).json({ error: "Invalid type" });
  }
  if (!id) {
    return res.status(400).json({ error: "Id is required" });
  }
  if (!content || !title) {
    return res.status(400).json({ error: "Content and title are required" });
  }

  const addJobToQueue = (namespace: string) => {
    console.log(
      `Indexing note ${id}:${title} for user ${creatorId} in namespace ${namespace}`
    );
    const jobId = uuidv4();
    jobQueue.add(
      "indexTextNote",
      {
        indexName: getDefaultIndexName(),
        namespace,
        content,
        title,
        creatorId,
        createdAt,
        type,
        id: Number(id),
      },
      { jobId }
    );
  };

  if (isPublic) {
    // public notes are indexed in both public and private namespaces.
    addJobToQueue(getNoteNamespace(creatorId, true));
    addJobToQueue(getNoteNamespace(creatorId, false));
  } else {
    addJobToQueue(getNoteNamespace(creatorId, false));
  }

  res.status(200).json({ message: "Job added to queue" });
});

app.delete("/jobs/note/:id", async (req: any, res: any) => {
  const noteId = Number(req.params.id);
  if (isNaN(noteId) || !noteId) {
    return res.status(400).json({ error: "Invalid note id" });
  }

  // TOOO: connect to prisma in the future to get creatorId automatically.
  const creatorId = Number(req.body.creatorId);
  if (isNaN(creatorId) || !creatorId) {
    return res.status(400).json({ error: "Invalid creatorId" });
  }

  const isPublic = req.body.public;
  if (typeof isPublic !== "boolean") {
    return res.status(400).json({ error: "Invalid isPublic" });
  }

  const type = req.body.type;
  if (!type) {
    return res.status(400).json({ error: "Invalid type" });
  }

  const namespace = getNoteNamespace(creatorId, isPublic);

  try {
    // Add a job to delete the note index
    const deleteJobId = uuidv4();
    jobQueue.add(
      "deleteNoteIndex",
      {
        noteId: noteId,
        type,
        indexName: getDefaultIndexName(),
        namespace,
      },
      { jobId: deleteJobId }
    );

    res.status(200).json({ message: "Job deleted successfully", deleteJobId });
  } catch (error) {
    console.error("Error deleting job:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/jobs/index/:jobId", verifySession, async (req: any, res: any) => {
  const jobId = req.params.jobId;
  const job = await jobQueue.getJob(jobId);

  if (!job) {
    res.status(404).send("Job not found");
    return;
  }

  const state = await job.getState();

  res.status(200).send({ state, job: job });
});

// Start the server
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
