import "server-only";
import { connectDB } from "@/lib/db";
import { CreditCard, SavingsBox } from "@/models";
import { listAccounts } from "@/modules/accounts/service";
import { listCategories, type CategoryNode } from "@/modules/categories/service";

export type Lookups = {
  accounts: { id: string; name: string; color: string; type: string; balance: number }[];
  categories: CategoryNode[];
  cards: { id: string; name: string; color: string; closingDay: number; dueDay: number }[];
  boxes: { id: string; name: string; color: string }[];
};

/** Dados de apoio para formulários (contas, categorias, cartões, caixinhas) do usuário. */
export async function getLookups(userId: string): Promise<Lookups> {
  await connectDB();
  const [accounts, categories, cards, boxes] = await Promise.all([
    listAccounts(userId),
    listCategories(userId),
    CreditCard.find({ userId, archived: false }).sort({ createdAt: 1 }).lean(),
    SavingsBox.find({ userId, archived: false }).sort({ createdAt: 1 }).lean(),
  ]);
  return {
    accounts: accounts.map((a) => ({ id: a.id, name: a.name, color: a.color ?? "#111", type: a.type, balance: a.balance })),
    categories,
    cards: cards.map((c) => ({ id: String(c._id), name: c.name, color: c.color ?? "#111", closingDay: c.closingDay, dueDay: c.dueDay })),
    boxes: boxes.map((b) => ({ id: String(b._id), name: b.name, color: b.color ?? "#111" })),
  };
}
