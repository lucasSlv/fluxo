import { requireUser } from "@/modules/auth/dal";
import { listCards } from "@/modules/credit-cards/service";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";
import { formatMoney } from "@/lib/money";
import { serialize } from "@/lib/utils";
import { CardsView, type CardItem } from "./_components/cards-view";

export const metadata = { title: "Cartões" };

export default async function CardsPage() {
  const user = await requireUser();
  const cards = await listCards(user.id, { includeArchived: true });
  const active = cards.filter((c) => !c.archived);
  const cur = user.preferences.currency;
  return (
    <>
      <PageHeader title="Cartões de crédito" description="Compras viram despesas na fatura; o pagamento da fatura apenas liquida a obrigação." />
      <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="Limite total" value={formatMoney(active.reduce((s, c) => s + c.limit, 0), cur)} />
        <Stat label="Em uso (faturas + parcelas)" value={formatMoney(active.reduce((s, c) => s + c.used, 0), cur)} tone="neg" />
        <Stat label="Disponível" value={formatMoney(active.reduce((s, c) => s + c.available, 0), cur)} tone="pos" />
      </section>
      <CardsView cards={serialize(cards) as unknown as CardItem[]} />
    </>
  );
}
