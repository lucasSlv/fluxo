import mongoose from "mongoose";
import { logger } from "./logger";

type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };

const globalForMongoose = globalThis as unknown as { __mongoose?: Cache };
const cache: Cache = globalForMongoose.__mongoose ?? { conn: null, promise: null };
globalForMongoose.__mongoose = cache;

mongoose.set("strictQuery", true);

/** Conexão única reaproveitada entre requisições (e entre recargas em desenvolvimento). */
export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI não configurada");
  if (!cache.promise) {
    cache.promise = mongoose.connect(uri, { maxPoolSize: 10 }).then((m) => {
      logger.info("mongodb.connected");
      return m;
    });
  }
  try {
    cache.conn = await cache.promise;
  } catch (err) {
    cache.promise = null;
    throw err;
  }
  return cache.conn;
}
