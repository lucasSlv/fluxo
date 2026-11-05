import mongoose from "mongoose";
import { connectDB } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Liveness/readiness: responde 200 quando o MongoDB está acessível. Usado pelo healthcheck do Docker. */
export async function GET() {
  try {
    await connectDB();
    await mongoose.connection.db!.admin().ping();
    return Response.json({ status: "ok" });
  } catch {
    return Response.json({ status: "error", db: "unreachable" }, { status: 503 });
  }
}
