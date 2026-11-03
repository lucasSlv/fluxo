import Link from "next/link";
import { ChevronRight, Tags } from "lucide-react";
import { requireUser } from "@/modules/auth/dal";
import { sessionsFor } from "@/modules/settings/service";
import { serialize } from "@/lib/utils";
import { Card, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { PasswordForm, PreferencesForm, ProfileForm, SessionsList } from "./_components/settings-forms";

export const metadata = { title: "Configurações" };

export default async function SettingsPage() {
  const user = await requireUser();
  const sessions = await sessionsFor(user.id, user.sessionId);
  return (
    <div className="max-w-4xl">
      <PageHeader title="Configurações" description="Seus dados, preferências e segurança da conta." />
      <div className="space-y-6">
        <Card>
          <CardTitle>Dados pessoais</CardTitle>
          <ProfileForm initial={{ name: user.name, email: user.email }} />
        </Card>
        <Card>
          <CardTitle>Senha</CardTitle>
          <PasswordForm />
        </Card>
        <Card>
          <CardTitle>Preferências</CardTitle>
          <PreferencesForm initial={user.preferences} />
        </Card>
        <Link href="/categories" className="flex items-center gap-4 rounded-2xl bg-muted p-5 transition hover:bg-neutral-200/60">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface shadow-soft">
            <Tags size={18} />
          </span>
          <div className="flex-1">
            <p className="text-[15px] font-bold">Categorias personalizadas</p>
            <p className="text-xs text-ink-3">Crie, edite e organize categorias, subcategorias, ícones e cores.</p>
          </div>
          <ChevronRight size={18} className="text-ink-3" />
        </Link>
        <Card>
          <CardTitle>Segurança e sessões</CardTitle>
          <p className="mb-4 text-xs text-ink-3">Cada sessão expira em 12 horas. Encerre as que você não reconhecer.</p>
          <SessionsList sessions={serialize(sessions)} dateFormat={user.preferences.dateFormat} />
        </Card>
      </div>
    </div>
  );
}
