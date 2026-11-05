"use server";

import { authedAction } from "@/modules/auth/dal";
import { readSession } from "@/modules/auth/session";

/** A sessão pode ter sido rotacionada por authedAction; relê o id atual a partir do cookie. */
async function currentSessionId(fallback: string) {
  return (await readSession())?.sessionId ?? fallback;
}
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/modules/auth/session";
import { deleteUserAccount, type DeleteAccountInput } from "./delete-account";
import { changePasswordAndRevoke, revokeOtherSessions, revokeUserSession, updatePreferences, updateProfile } from "./service";
import type { PreferencesInput, ProfileInput } from "./schemas";

export async function updateProfileAction(input: ProfileInput) {
  return authedAction("settings.profile", (u) => updateProfile(u.id, input));
}
export async function updatePreferencesAction(input: PreferencesInput) {
  return authedAction("settings.preferences", (u) => updatePreferences(u.id, input));
}
export async function changePasswordAction(input: { currentPassword: string; newPassword: string; confirm: string }) {
  return authedAction("settings.password", async (u) => changePasswordAndRevoke(u.id, await currentSessionId(u.sessionId), input));
}
export async function revokeSessionAction(sessionId: string) {
  return authedAction("settings.session.revoke", async (u) => revokeUserSession(u.id, await currentSessionId(u.sessionId), sessionId));
}
export async function revokeOtherSessionsAction() {
  return authedAction("settings.session.revoke_others", async (u) => revokeOtherSessions(u.id, await currentSessionId(u.sessionId)));
}

/** Exclui a conta do usuário e todo o histórico. O cookie de sessão é removido em seguida. */
export async function deleteMyAccountAction(input: DeleteAccountInput) {
  const res = await authedAction("settings.account.delete", (u) => deleteUserAccount(u.id, input));
  if (res.ok) (await cookies()).delete(SESSION_COOKIE);
  return res;
}
