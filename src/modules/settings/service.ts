import "server-only";
import { connectDB } from "@/lib/db";
import { AppError, isDuplicateKey } from "@/lib/errors";
import { User } from "@/models";
import { changePassword } from "@/modules/auth/service";
import { listSessions, revokeOtherSessions, revokeSession } from "@/modules/auth/session";
import type { changePasswordSchema } from "@/modules/auth/schemas";
import { preferencesSchema, profileSchema, type PreferencesInput, type ProfileInput } from "./schemas";
import type { z } from "zod";

export async function updateProfile(userId: string, input: ProfileInput) {
  const data = profileSchema.parse(input);
  await connectDB();
  if (await User.exists({ email: data.email, _id: { $ne: userId } })) {
    throw new AppError("CONFLICT", "Este e-mail já está em uso.", { email: "E-mail já cadastrado" });
  }
  try {
    await User.updateOne({ _id: userId }, { $set: data });
  } catch (err) {
    if (isDuplicateKey(err)) throw new AppError("CONFLICT", "Este e-mail já está em uso.", { email: "E-mail já cadastrado" });
    throw err;
  }
}

export async function updatePreferences(userId: string, input: PreferencesInput) {
  const data = preferencesSchema.parse(input);
  await connectDB();
  await User.updateOne(
    { _id: userId },
    {
      $set: {
        "preferences.currency": data.currency,
        "preferences.dateFormat": data.dateFormat,
        "preferences.timezone": data.timezone,
        "preferences.alertThresholds": data.alertThresholds,
        "preferences.dueSoonDays": data.dueSoonDays,
      },
    },
  );
}

/** Troca a senha e encerra as demais sessões (mantém apenas a atual). */
export async function changePasswordAndRevoke(userId: string, sessionId: string, input: z.input<typeof changePasswordSchema>) {
  await changePassword(userId, input);
  return revokeOtherSessions(userId, sessionId);
}

export async function sessionsFor(userId: string, currentSessionId: string) {
  const sessions = await listSessions(userId);
  return sessions.map((s) => ({
    id: String(s._id),
    userAgent: s.userAgent ?? "",
    ip: s.ip ?? "",
    createdAt: s.createdAt as Date,
    lastUsedAt: s.lastUsedAt ?? (s.createdAt as Date),
    expiresAt: s.expiresAt,
    current: String(s._id) === currentSessionId,
  }));
}

export async function revokeUserSession(userId: string, currentSessionId: string, sessionId: string) {
  if (sessionId === currentSessionId) throw new AppError("VALIDATION", "Use “Sair” para encerrar a sessão atual.");
  await revokeSession(userId, sessionId);
}

export { revokeOtherSessions };
