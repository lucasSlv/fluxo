import mongoose from "mongoose";
import { afterAll, beforeEach } from "vitest";
import { connectDB } from "@/lib/db";
import * as models from "@/models";

process.env.LOG_LEVEL = "error";

beforeEach(async () => {
  await connectDB();
  await Promise.all(Object.values(models).filter((m) => typeof m === "function" && "syncIndexes" in m).map((m) => (m as typeof mongoose.Model).syncIndexes()));
  const db = mongoose.connection.db!;
  for (const c of await db.collections()) await c.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
});
