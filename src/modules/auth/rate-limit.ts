import "server-only";
import { connectDB } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { RateLimit } from "@/models";

/**
 * Janela fixa persistida no MongoDB (funciona com várias instâncias).
 * Lança RATE_LIMITED quando `max` tentativas são excedidas na janela.
 */
export async function rateLimit(key: string, max: number, windowSeconds: number): Promise<void> {
  await connectDB();
  const now = new Date();
  const doc = await RateLimit.findOneAndUpdate(
    { key, expiresAt: { $gt: now } },
    { $inc: { count: 1 } },
    { new: true },
  ).lean();
  if (doc) {
    if (doc.count > max) {
      const wait = Math.ceil((doc.expiresAt.getTime() - now.getTime()) / 60000);
      throw new AppError("RATE_LIMITED", `Muitas tentativas. Tente novamente em ${wait} min.`);
    }
    return;
  }
  // Janela nova (substitui a expirada, se ainda não removida pelo TTL).
  await RateLimit.updateOne(
    { key },
    { $set: { count: 1, expiresAt: new Date(now.getTime() + windowSeconds * 1000) } },
    { upsert: true },
  );
}

export async function resetRateLimit(key: string): Promise<void> {
  await connectDB();
  await RateLimit.deleteOne({ key });
}
