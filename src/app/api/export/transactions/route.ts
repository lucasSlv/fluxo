import type { NextRequest } from "next/server";
import { formatDate } from "@/lib/dates";
import { exportTransactions } from "@/modules/transactions/service";
import { KIND_LABEL } from "@/modules/transactions/schemas";
import { csvResponse, withUser } from "../../_helpers";

export const runtime = "nodejs";

const STATUS: Record<string, string> = { paid: "Efetivado", pending: "Pendente", cancelled: "Cancelado" };
type Ref = { name?: string } | null;

export async function GET(req: NextRequest) {
  return withUser(async (user) => {
    const params = Object.fromEntries(req.nextUrl.searchParams.entries());
    const items = await exportTransactions(user.id, params, user.preferences.timezone);
    const header = ["Data", "Descrição", "Tipo", "Categoria", "Conta", "Conta destino", "Cartão", "Status", "Valor (R$)", "Vencimento", "Natureza"];
    const rows = items.map((t) => {
      const sign = t.kind === "expense" ? -1 : 1;
      return [
        formatDate(t.date),
        t.description,
        KIND_LABEL[t.kind] ?? t.kind,
        (t.categoryId as unknown as Ref)?.name ?? "",
        (t.accountId as unknown as Ref)?.name ?? "",
        (t.toAccountId as unknown as Ref)?.name ?? "",
        (t.creditCardId as unknown as Ref)?.name ?? "",
        STATUS[t.status] ?? t.status,
        t.amount * sign,
        t.dueDate ? formatDate(t.dueDate) : "",
        t.kind === "expense" ? (t.nature === "fixed" ? "Fixa" : "Variável") : "",
      ];
    });
    const suffix = params.from && params.to ? `${params.from}_${params.to}` : "todas";
    return csvResponse([header, ...rows], `movimentacoes_${suffix}.csv`);
  });
}
