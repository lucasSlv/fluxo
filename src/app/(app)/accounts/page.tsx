import Link from "next/link";
import { Archive, Wallet } from "lucide-react";
import { requireUser } from "@/modules/auth/dal";
import { listAccounts } from "@/modules/accounts/service";
import { deleteAccountAction } from "@/modules/accounts/actions";
import { ACCOUNT_TYPE_LABEL } from "@/modules/accounts/schemas";
import { formatMoney } from "@/lib/money";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AccountFormButton } from "./_components/account-form";
import { NewTransactionButton } from "../transactions/_components/new-button";

export const metadata = { title: "Contas" };

export default async function AccountsPage({ searchParams }: { searchParams: Promise<{ welcome?: string; archived?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const all = await listAccounts(user.id, { includeArchived: true });
  const accounts = all.filter((a) => !a.archived);
  const archived = all.filter((a) => a.archived);
  const total = accounts.reduce((s, a) => s + a.balance, 0);
  const cur = user.preferences.currency;

  return (
    <div>
      <PageHeader
        title="Contas e carteiras"
        description="Saldo calculado a partir do saldo inicial e das movimentações efetivadas."
        actions={
          <>
            {accounts.length >= 2 && <NewTransactionButton label="Transferir" variant="secondary" initial={{ kind: "transfer" }} />}
            <AccountFormButton />
          </>
        }
      />
      {sp.welcome && !accounts.length && (
        <div className="mb-6 rounded-2xl bg-ink p-5 text-white">
          <p className="font-bold">Bem-vindo ao Fluxo! 👋</p>
          <p className="mt-1 text-sm text-white/70">Comece cadastrando suas contas com o saldo atual. Depois registre receitas e despesas — o dashboard é montado com os seus dados reais.</p>
        </div>
      )}
      {accounts.length > 0 && (
        <div className="mb-6 rounded-2xl bg-muted p-5">
          <p className="text-xs font-semibold text-ink-3">Saldo total disponível</p>
          <p className={cn("mt-1 text-3xl font-extrabold tracking-tight tabular", total < 0 && "text-neg")}>{formatMoney(total, cur)}</p>
        </div>
      )}
      {!accounts.length ? (
        <EmptyState icon={<Wallet size={20} />} title="Nenhuma conta cadastrada" description="Conta corrente, poupança, dinheiro em espécie, carteiras digitais ou investimentos." action={<AccountFormButton />} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {accounts.map((a) => (
            <div key={a.id} className="group relative overflow-hidden rounded-2xl bg-muted p-5 transition hover:shadow-soft">
              <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: a.color ?? "#111" }} />
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-bold">{a.name}</p>
                  <p className="text-xs text-ink-3">
                    {ACCOUNT_TYPE_LABEL[a.type as keyof typeof ACCOUNT_TYPE_LABEL]}
                    {a.institution ? ` · ${a.institution}` : ""}
                  </p>
                </div>
                <div className="flex">
                  <AccountFormButton id={a.id} initial={{ name: a.name, type: a.type, institution: a.institution ?? "", initialBalance: a.initialBalance, color: a.color ?? "#111111" }} />
                  <ConfirmButton
                    action={deleteAccountAction.bind(null, a.id)}
                    title="Remover conta?"
                    description="Se a conta tiver movimentações, ela será arquivada para preservar o histórico. Caso contrário, será excluída."
                    success="Conta removida"
                    size="icon"
                  >
                    <Archive size={15} />
                  </ConfirmButton>
                </div>
              </div>
              <p className={cn("mt-5 text-2xl font-extrabold tracking-tight tabular", a.balance < 0 && "text-neg")}>{formatMoney(a.balance, cur)}</p>
              <Link href={`/accounts/${a.id}`} className="mt-3 inline-flex h-8 items-center rounded-lg bg-ink px-3 text-xs font-semibold text-white hover:bg-neutral-800">
                Ver extrato
              </Link>
            </div>
          ))}
        </div>
      )}
      {archived.length > 0 && (
        <details className="mt-8">
          <summary className="cursor-pointer text-sm font-semibold text-ink-3">Contas arquivadas ({archived.length})</summary>
          <ul className="mt-3 space-y-2">
            {archived.map((a) => (
              <li key={a.id} className="flex items-center gap-3 rounded-xl bg-muted px-4 py-3 text-sm">
                <span className="flex-1 font-semibold">{a.name}</span>
                <Badge>Arquivada</Badge>
                <span className="tabular">{formatMoney(a.balance, cur)}</span>
                <ConfirmButton action={deleteAccountAction.bind(null, a.id)} title="Reativar conta?" confirmLabel="Reativar" tone="primary" success="Conta reativada">
                  Reativar
                </ConfirmButton>
                <Link href={`/accounts/${a.id}`} className="text-xs font-semibold underline">
                  Extrato
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
