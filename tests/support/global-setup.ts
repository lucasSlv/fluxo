import { MongoMemoryReplSet } from "mongodb-memory-server";

let server: MongoMemoryReplSet;

export async function setup() {
  server = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  process.env.MONGODB_URI = server.getUri("fluxo-test");
}

export async function teardown() {
  await server?.stop();
}
