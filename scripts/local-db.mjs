// MongoDB local persistente para desenvolvimento (sem Docker): dados em ./.mongo-data
// Porta configurável com MONGO_PORT (padrão 27017); ajuste MONGODB_URI de acordo.
import { MongoMemoryServer } from "mongodb-memory-server";
import { mkdirSync } from "node:fs";

mkdirSync(".mongo-data", { recursive: true });
const server = await MongoMemoryServer.create({ instance: { port: Number(process.env.MONGO_PORT ?? 27017), dbPath: ".mongo-data", storageEngine: "wiredTiger" } });
console.log(`MongoDB local pronto em ${server.getUri()}`);
const stop = async () => { await server.stop({ doCleanup: false }); process.exit(0); };
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
