"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { toErrorResult, type ActionResult } from "@/lib/errors";
import { authenticate, registerUser } from "./service";
import { createSession, destroyCurrentSession } from "./session";

async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "local").trim();
}

export type AuthFormState = ActionResult<null> | null;

export async function loginAction(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  try {
    const userId = await authenticate({ email: String(form.get("email") ?? ""), password: String(form.get("password") ?? "") }, await clientIp());
    await createSession(userId);
  } catch (err) {
    return toErrorResult(err);
  }
  redirect("/dashboard");
}

export async function registerAction(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  try {
    const { id } = await registerUser(
      { name: String(form.get("name") ?? ""), email: String(form.get("email") ?? ""), password: String(form.get("password") ?? "") },
      await clientIp(),
    );
    await createSession(id);
  } catch (err) {
    return toErrorResult(err);
  }
  redirect("/accounts?welcome=1");
}

export async function logoutAction(): Promise<void> {
  await destroyCurrentSession();
  redirect("/login");
}
