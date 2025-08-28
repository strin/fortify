import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, "./.env") });

const PINECONE_API_ENV = process.env.PINECONE_API_ENV;
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;

import { Pinecone } from "@pinecone-database/pinecone";

if (!PINECONE_API_ENV) {
  console.error("PINECONE_API_ENV is not set");
  process.exit(1);
}

if (!PINECONE_API_KEY) {
  console.error("PINECONE_API_KEY is not set");
  process.exit(1);
}

const pineconeClient = new Pinecone({
  apiKey: PINECONE_API_KEY,
});

const indexName = "creators";
const namespace = "users/1";

const index = pineconeClient.Index(indexName);
console.log("index", index);

//const query = await index.query({
//  namespace,
//  vector: [0.1, 0.2, 0.3],
//  topK: 10,
//});
