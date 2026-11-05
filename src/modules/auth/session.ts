import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { connectDB } from "@/lib/db";
import { Session } from "@/models";

export const SESSION_COOKIE = "fluxo_session";
const TTL_MS = Number(process.env.SESSION_TTL_HOURS ?? 12) * 3600_000;

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export type ActiveSession = { sessionId: string; userId: string; expiresAt: Date; createdAt: Date };

/** Cookie `Secure` em produção. COOKIE_SECURE=false permite testar o build de produção via HTTP (ex.: docker compose local). */
function cookieSecure(): boolean {
  if (process.env.COOKIE_SECURE) return process.env.COOKIE_SECURE !== "false";
  return process.env.NODE_ENV === "production";
}

async function setCookie(token: string, expiresAt: Date) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** Cria a sessão no banco (só o hash do token é persistido) e grava o cookie. */
export async function createSession(userId: string): Promise<void> {
  await connectDB();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + TTL_MS);
  const h = await headers();
  await Session.create({
    userId,
    tokenHash: sha256(token),
    expiresAt,
    userAgent: h.get("user-agent")?.slice(0, 250) ?? "",
    ip: (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "").trim(),
  });
  await setCookie(token, expiresAt);
}

/** Valida o cookie contra o banco. Não escreve cookies (pode ser usado em Server Components). */
export async function readSession(): Promise<ActiveSession | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  await connectDB();
  const s = await Session.findOne({ tokenHash: sha256(token), expiresAt: { $gt: new Date() } }).lean();
  if (!s) return null;
  return { sessionId: String(s._id), userId: String(s.userId), expiresAt: s.expiresAt, createdAt: s.createdAt as Date };
}

/**
 * Renovação segura: depois de metade da vida útil, emite um novo token e invalida o anterior.
 * Só pode ser chamada em Server Actions / Route Handlers (escreve cookie).
 */
export async function maybeRotateSession(s: ActiveSession): Promise<void> {
  const age = Date.now() - s.createdAt.getTime();
  if (age < TTL_MS / 2) {
    await Session.updateOne({ _id: s.sessionId }, { $set: { lastUsedAt: new Date() } });
    return;
  }
  const old = await Session.findOneAndDelete({ _id: s.sessionId }).lean();
  if (!old) return;
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + TTL_MS);
  await Session.create({ userId: s.userId, tokenHash: sha256(token), expiresAt, userAgent: old.userAgent, ip: old.ip });
  await setCookie(token, expiresAt);
}

export async function destroyCurrentSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await connectDB();
    await Session.deleteOne({ tokenHash: sha256(token) });
  }
  jar.delete(SESSION_COOKIE);
}

export async function listSessions(userId: string) {
  await connectDB();
  return Session.find({ userId, expiresAt: { $gt: new Date() } })
    .sort({ lastUsedAt: -1 })
    .select("userAgent ip createdAt lastUsedAt expiresAt")
    .lean();
}

export async function revokeSession(userId: string, sessionId: string): Promise<void> {
  await connectDB();
  await Session.deleteOne({ _id: sessionId, userId });
}

export async function revokeOtherSessions(userId: string, keepSessionId: string): Promise<number> {
  await connectDB();
  const r = await Session.deleteMany({ userId, _id: { $ne: keepSessionId } });
  return r.deletedCount ?? 0;
}
