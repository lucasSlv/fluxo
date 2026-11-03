import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import { AppError, toErrorResult, type ActionResult } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { User } from "@/models";
import { maybeRotateSession, readSession, type ActiveSession } from "./session";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  sessionId: string;
  preferences: { currency: string; dateFormat: "dd/MM/yyyy" | "yyyy-MM-dd"; timezone: string; alertThresholds: number[]; dueSoonDays: number };
};

/** Data Access Layer: único ponto que resolve "quem é o usuário" a partir da sessão. */
export const getCurrentUser = cache(async (): Promise<(CurrentUser & { session: ActiveSession }) | null> => {
  const session = await readSession();
  if (!session) return null;
  await connectDB();
  const u = await User.findById(session.userId).lean();
  if (!u) return null;
  const p = u.preferences ?? ({} as NonNullable<typeof u.preferences>);
  return {
    id: String(u._id),
    name: u.name,
    email: u.email,
    sessionId: session.sessionId,
    session,
    preferences: {
      currency: p.currency ?? "BRL",
      dateFormat: (p.dateFormat as CurrentUser["preferences"]["dateFormat"]) ?? "dd/MM/yyyy",
      timezone: p.timezone ?? "America/Sao_Paulo",
      alertThresholds: p.alertThresholds?.length ? [...p.alertThresholds] : [50, 75, 90, 100],
      dueSoonDays: p.dueSoonDays ?? 5,
    },
  };
});

/** Para páginas: redireciona ao login se não houver sessão válida. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Envelope de Server Actions autenticadas: resolve o usuário pela sessão (nunca pelo payload),
 * renova a sessão quando necessário e converte erros em ActionResult.
 */
export async function authedAction<T>(name: string, fn: (user: CurrentUser) => Promise<T>): Promise<ActionResult<T>> {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError("UNAUTHORIZED", "Sua sessão expirou. Entre novamente.");
    await maybeRotateSession(user.session);
    const data = await fn(user);
    logger.info("action.ok", { action: name, userId: user.id });
    return { ok: true, data };
  } catch (err) {
    const res = toErrorResult(err);
    if (res.code !== "VALIDATION") logger.warn("action.fail", { action: name, code: res.code, message: res.error });
    return res;
  }
}
