"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { loginAction, registerAction, type AuthFormState } from "@/modules/auth/actions";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(mode === "login" ? loginAction : registerAction, null);
  const err = state && !state.ok ? state : null;
  const fe = err?.fieldErrors ?? {};
  return (
    <form action={action} className="flex h-full flex-col justify-center gap-5">
      <div className="mb-2">
        <span className="mb-6 block text-3xl font-extrabold tracking-tighter md:hidden">F.</span>
        <h1 className="text-[28px] font-extrabold tracking-tight">{mode === "login" ? "Olá de novo!" : "Crie sua conta"}</h1>
        <p className="mt-1 text-sm text-ink-3">{mode === "login" ? "Que bom ver você outra vez." : "Leva menos de um minuto."}</p>
      </div>
      {mode === "register" && (
        <Field label="Nome" error={fe.name}>
          <Input name="name" autoComplete="name" required invalid={!!fe.name} />
        </Field>
      )}
      <Field label="E-mail" error={fe.email}>
        <Input name="email" type="email" autoComplete="email" required invalid={!!fe.email} />
      </Field>
      <Field label="Senha" error={fe.password} hint={mode === "register" ? "Mínimo de 8 caracteres, com letras e números." : undefined}>
        <Input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required invalid={!!fe.password} />
      </Field>
      {err && !Object.keys(fe).length && <p className="rounded-xl bg-neg-soft px-3 py-2 text-sm font-medium text-red-800">{err.error}</p>}
      <Button type="submit" size="lg" loading={pending}>
        {mode === "login" ? "Entrar" : "Criar conta"}
      </Button>
      <p className="text-center text-sm text-ink-3">
        {mode === "login" ? (
          <>
            Ainda não tem conta?{" "}
            <Link href="/register" className="font-semibold text-ink underline-offset-4 hover:underline">
              Cadastre-se
            </Link>
          </>
        ) : (
          <>
            Já tem conta?{" "}
            <Link href="/login" className="font-semibold text-ink underline-offset-4 hover:underline">
              Entrar
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
