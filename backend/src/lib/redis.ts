import { env } from "../config/env";

// Parse Redis URL into host/port so BullMQ's own bundled ioredis handles it,
// avoiding the version conflict that occurs when a separate ioredis is installed.
const url = new URL(env.REDIS_URL);

export const redis = {
  host: url.hostname,
  port: parseInt(url.port || "6379", 10),
  maxRetriesPerRequest: null as null, // required by BullMQ
};
