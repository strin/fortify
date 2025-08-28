import IORedis from "ioredis";

const REDIS_URL = process.env.REDIS_URL;
if (!REDIS_URL) {
  throw new Error("REDIS_URL is not defined");
}

export const redisConnection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
});
