"use client";

import { useState } from "react";
import { Laptop, LogOut, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox, Field, Input, Select } from "@/components/ui/field";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { useAction } from "@/hooks/use-action";
import { formatDate } from "@/lib/dates";
import {
  changePasswordAction, revokeOtherSessionsAction, revokeSessionAction, updatePreferencesAction, updateProfileAction,
} from "@/modules/settings/actions";

export function ProfileForm({ initial }: { initial: { name: string; email: string } }) {
  const [v, setV] = useState(initial);
  const { run, pending, fieldErrors } = useAction(updateProfileAction, { success: "Dados atualizados" });
  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        run(v);
      }}
    >
      <Field label="Nome" error={fieldErrors.name}>
        <Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} invalid={!!fieldErrors.name} autoComplete="name" />
      </Field>
      <Field label="E-mail" error={fieldErrors.email}>
        <Input type="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} invalid={!!fieldErrors.email} autoComplete="email" />
      </Field>
      <div className="sm:col-span-2">
        <Button type="submit" loading={pending}>
          Salvar dados
        </Button>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const empty = { currentPassword: "", newPassword: "", confirm: "" };
  const [v, setV] = useState(empty);
  const { run, pending, fieldErrors } = useAction(changePasswordAction, {
    success: "Senha alterada. As outras sessões foram encerradas.",
    onSuccess: () => setV(empty),
  });
  return (
    <form
      className="grid gap-4 sm:grid-cols-3"
      onSubmit={(e) => {
        e.preventDefault();
        run(v);
      }}
    >
      <Field label="Senha atual" error={fieldErrors.currentPassword}>
        <Input type="password" autoComplete="current-password" value={v.currentPassword} onChange={(e) => setV({ ...v, currentPassword: e.target.value })} invalid={!!fieldErrors.currentPassword} />
      </Field>
      <Field label="Nova senha" error={fieldErrors.newPassword} hint="Mín. 8 caracteres, com letras e números">
        <Input type="password" autoComplete="new-password" value={v.newPassword} onChange={(e) => setV({ ...v, newPassword: e.target.value })} invalid={!!fieldErrors.newPassword} />
      </Field>
      <Field label="Confirmar nova senha" error={fieldErrors.confirm}>
        <Input type="password" autoComplete="new-password" value={v.confirm} onChange={(e) => setV({ ...v, confirm: e.target.value })} invalid={!!fieldErrors.confirm} />
      </Field>
      <div className="sm:col-span-3">
        <Button type="submit" loading={pending}>
          Alterar senha
        </Button>
      </div>
    </form>
  );
}

const THRESHOLDS = [50, 75, 90, 100];
const TIMEZONES = ["America/Sao_Paulo", "America/Manaus", "America/Cuiaba", "America/Belem", "America/Fortaleza", "America/Recife", "America/Bahia", "America/Rio_Branco", "America/Noronha", "UTC", "Europe/Lisbon", "America/New_York"];

export function PreferencesForm({
  initial,
}: {
  initial: { currency: string; dateFormat: "dd/MM/yyyy" | "yyyy-MM-dd"; timezone: string; alertThresholds: number[]; dueSoonDays: number };
}) {
  const [v, setV] = useState(initial);
  const { run, pending, fieldErrors } = useAction(updatePreferencesAction, { success: "Preferências salvas" });
  const zones = TIMEZONES.includes(v.timezone) ? TIMEZONES : [v.timezone, ...TIMEZONES];
  const toggle = (t: number) =>
    setV((s) => ({ ...s, alertThresholds: s.alertThresholds.includes(t) ? s.alertThresholds.filter((x) => x !== t) : [...s.alertThresholds, t] }));
  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        run({ ...v, currency: v.currency as "BRL" });
      }}
    >
      <Field label="Moeda" error={fieldErrors.currency}>
        <Select value={v.currency} onChange={(e) => setV({ ...v, currency: e.target.value })}>
          <option value="BRL">Real (R$)</option>
          <option value="USD">Dólar (US$)</option>
          <option value="EUR">Euro (€)</option>
        </Select>
      </Field>
      <Field label="Formato de data">
        <Select value={v.dateFormat} onChange={(e) => setV({ ...v, dateFormat: e.target.value as typeof v.dateFormat })}>
          <option value="dd/MM/yyyy">31/12/2026</option>
          <option value="yyyy-MM-dd">2026-12-31</option>
        </Select>
      </Field>
      <Field label="Fuso horário" error={fieldErrors.timezone} hint="Define o que é “hoje” para vencimentos e atrasos">
        <Select value={v.timezone} onChange={(e) => setV({ ...v, timezone: e.target.value })}>
          {zones.map((z) => (
            <option key={z} value={z}>
              {z.replace("_", " ")}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Avisar vencimentos com antecedência de (dias)" error={fieldErrors.dueSoonDays}>
        <Input type="number" min={0} max={30} value={v.dueSoonDays} onChange={(e) => setV({ ...v, dueSoonDays: Number(e.target.value) })} />
      </Field>
      <div className="sm:col-span-2">
        <p className="mb-2 text-xs font-semibold text-ink-2">Alertas de limite por categoria</p>
        <div className="flex flex-wrap gap-4">
          {THRESHOLDS.map((t) => (
            <Checkbox key={t} label={t === 100 ? "100% ou mais" : `${t}%`} checked={v.alertThresholds.includes(t)} onChange={() => toggle(t)} />
          ))}
        </div>
        {fieldErrors.alertThresholds && <p className="mt-1 text-xs font-medium text-neg">{fieldErrors.alertThresholds}</p>}
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" loading={pending}>
          Salvar preferências
        </Button>
      </div>
    </form>
  );
}

type SessionItem = { id: string; userAgent: string; ip: string; createdAt: string; lastUsedAt: string; expiresAt: string; current: boolean };

function describeAgent(ua: string) {
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Navegador";
  const os = /iPhone|iPad/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Mac OS X/.test(ua) ? "macOS" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : "";
  return { label: os ? `${browser} · ${os}` : browser, mobile: /iPhone|iPad|Android/.test(ua) };
}

const dt = (s: string) => new Date(s).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

export function SessionsList({ sessions, dateFormat }: { sessions: SessionItem[]; dateFormat: "dd/MM/yyyy" | "yyyy-MM-dd" }) {
  const others = sessions.filter((s) => !s.current).length;
  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {sessions.map((s) => {
          const a = describeAgent(s.userAgent);
          const Icon = a.mobile ? Smartphone : Laptop;
          return (
            <li key={s.id} className="flex items-center gap-3 rounded-2xl bg-surface p-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-ink-2">
                <Icon size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-bold">
                  {a.label} {s.current && <Badge tone="dark">Esta sessão</Badge>}
                </p>
                <p className="truncate text-xs text-ink-3">
                  {s.ip || "IP desconhecido"} · último uso {dt(s.lastUsedAt)} · expira {formatDate(s.expiresAt, dateFormat)} {new Date(s.expiresAt).toLocaleTimeString("pt-BR", { timeStyle: "short" })}
                </p>
              </div>
              {!s.current && (
                <ConfirmButton action={() => revokeSessionAction(s.id)} title="Encerrar sessão?" description="O dispositivo precisará entrar novamente." confirmLabel="Encerrar" success="Sessão encerrada">
                  <LogOut size={14} /> Encerrar
                </ConfirmButton>
              )}
            </li>
          );
        })}
      </ul>
      {others > 0 && (
        <ConfirmButton
          action={revokeOtherSessionsAction}
          title="Encerrar outras sessões?"
          description={`${others} ${others === 1 ? "sessão será encerrada" : "sessões serão encerradas"}. Esta sessão continua ativa.`}
          confirmLabel="Encerrar todas"
          success="Outras sessões encerradas"
          variant="outline"
          size="md"
        >
          Encerrar outras sessões
        </ConfirmButton>
      )}
    </div>
  );
}
