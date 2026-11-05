/**
 * DADOS DE DEMONSTRAÇÃO — separados do uso real.
 * Cria (ou recria) apenas o usuário demo@fluxo.test com 6 meses de histórico, usando os mesmos
 * services da aplicação (as regras de negócio são aplicadas normalmente).
 *   npm run seed:demo
 */
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { addMonths, monthKey, toISODate, today, dateOnly } from "@/lib/dates";
import { Category, User, Transaction, Account, Budget, CreditCard, Debt, Goal, Recurrence, SavingsBox, Session, AuditLog } from "@/models";
import { registerUser } from "@/modules/auth/service";
import { createAccount } from "@/modules/accounts/service";
import { createTransaction } from "@/modules/transactions/service";
import { createRecurrence } from "@/modules/recurring/service";
import { createCard, createPurchase, payInvoice, cardInvoices } from "@/modules/credit-cards/service";
import { createDebt } from "@/modules/debts/service";
import { createBox, moveBox } from "@/modules/savings/service";
import { createGoal } from "@/modules/goals/service";
import { setBudget } from "@/modules/budgets/service";

const EMAIL = "demo@fluxo.test";
const TZ = "America/Sao_Paulo";

async function main() {
  // O usuário demo tem senha pública: nunca o crie em produção por engano.
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED !== "true") {
    throw new Error("seed:demo bloqueado em produção (defina ALLOW_DEMO_SEED=true se for intencional).");
  }
  await connectDB();
  const old = await User.findOne({ email: EMAIL }).lean();
  if (old) {
    const userId = old._id;
    for (const M of [Category, Transaction, Account, Budget, CreditCard, Debt, Goal, Recurrence, SavingsBox, Session, AuditLog] as unknown as mongoose.Model<unknown>[])
      await M.deleteMany({ userId });
    await User.deleteOne({ _id: userId });
  }
  const { id: u } = await registerUser({ name: "Demo Fluxo", email: EMAIL, password: "demo12345" }, "seed");
  const cat = async (name: string, kind: "income" | "expense" = "expense") => String((await Category.findOne({ userId: u, name, kind }).lean())!._id);

  const t = today(TZ);
  const start = dateOnly(t.getUTCFullYear(), t.getUTCMonth() + 1, 1);
  const first = addMonths(start, -5);
  const checking = (await createAccount(u, { name: "Conta corrente", type: "checking", institution: "Banco", initialBalance: 420000, color: "#111111" })).id;
  const wallet = (await createAccount(u, { name: "Carteira", type: "cash", initialBalance: 15000, color: "#16a34a" })).id;

  // Recorrências desde 6 meses atrás (ocorrências geradas automaticamente).
  const rec = async (description: string, amount: number, category: string, dueDay: number, kind: "income" | "expense" = "expense") =>
    createRecurrence(u, { kind, description, amount, categoryId: await cat(category, kind), accountId: checking, frequency: "monthly", startDate: toISODate(first), dueDay }, TZ);
  await rec("Salário", 780000, "Salário", 5, "income");
  await rec("Aluguel", 210000, "Moradia", 10);
  await rec("Internet", 11990, "Assinaturas", 15);
  await rec("Academia", 12900, "Saúde", 8);
  await rec("Streaming", 5590, "Assinaturas", 20);

  // Marca ocorrências passadas como pagas.
  await Transaction.updateMany({ userId: u, recurrenceId: { $ne: null }, date: { $lt: t } }, { $set: { status: "paid", paidAt: new Date() } });
  // Deixa a internet do mês passado em atraso, para demonstrar alertas.
  const lastNet = await Transaction.findOne({ userId: u, description: "Internet", date: { $lt: t } }).sort({ date: -1 });
  if (lastNet) await Transaction.updateOne({ _id: lastNet._id }, { $set: { status: "pending", paidAt: null } });

  // Despesas variáveis por mês com leve tendência.
  const food = await cat("Alimentação");
  const transport = await cat("Transporte");
  const leisure = await cat("Lazer");
  for (let i = 0; i < 6; i++) {
    const m = addMonths(first, i);
    const day = (d: number) => toISODate(dateOnly(m.getUTCFullYear(), m.getUTCMonth() + 1, d));
    if (dateOnly(m.getUTCFullYear(), m.getUTCMonth() + 1, 3) > t) break;
    const mk = (d: number) => dateOnly(m.getUTCFullYear(), m.getUTCMonth() + 1, d) <= t;
    if (mk(3)) await createTransaction(u, { kind: "expense", description: "Supermercado", amount: 52000 + i * 4200, date: day(3), categoryId: food, accountId: checking, paymentMethod: "debit" });
    if (mk(12)) await createTransaction(u, { kind: "expense", description: "Restaurante", amount: 9800 + i * 1500, date: day(12), categoryId: food, accountId: checking, paymentMethod: "pix" });
    if (mk(7)) await createTransaction(u, { kind: "expense", description: "Combustível", amount: 28000 - i * 1200, date: day(7), categoryId: transport, accountId: checking, paymentMethod: "debit" });
    if (mk(18)) await createTransaction(u, { kind: "expense", description: "Cinema e jantar", amount: i % 2 ? 18000 : 9000, date: day(18), categoryId: leisure, accountId: wallet, paymentMethod: "cash" });
    if (i === 3 && mk(22)) await createTransaction(u, { kind: "income", description: "Freela de design", amount: 150000, date: day(22), categoryId: await cat("Renda extra", "income"), accountId: checking, paymentMethod: "pix" });
  }

  // Cartão com compra parcelada e fatura paga.
  const { id: card } = await createCard(u, { name: "Cartão Black", institution: "Banco", limit: 800000, closingDay: 25, dueDay: 5, color: "#111111", defaultAccountId: checking });
  // Assinatura cobrada todo mês no cartão.
  await createRecurrence(u, { kind: "expense", description: "Spotify", amount: 2190, categoryId: await cat("Assinaturas"), creditCardId: card, frequency: "monthly", startDate: toISODate(first), dueDay: 12 }, TZ);
  await createPurchase(u, { cardId: card, description: "Notebook", amount: 480000, date: toISODate(addMonths(start, -2)), installments: 10, categoryId: await cat("Compras") });
  await createPurchase(u, { cardId: card, description: "Passagens", amount: 96000, date: toISODate(addMonths(start, -1)), installments: 3, categoryId: leisure });
  for (const inv of await cardInvoices(u, card, TZ)) {
    if (inv.status === "closed" || inv.status === "overdue") await payInvoice(u, { cardId: card, invoiceMonth: inv.month, accountId: checking, amount: inv.remaining, date: toISODate(inv.dueDate) }, TZ);
  }

  // Dívida, caixinhas, objetivos e limites.
  await createDebt(u, { name: "Financiamento da moto", creditor: "Financeira", kind: "financing", installmentsCount: 24, installmentAmount: 45000, paidBefore: 6, contractDate: toISODate(addMonths(start, -8)), firstDueDate: toISODate(addMonths(start, -6)), accountId: checking });
  await Transaction.updateMany({ userId: u, debtId: { $ne: null }, dueDate: { $lt: t } }, { $set: { status: "paid", paidAt: new Date() } });
  const { id: reserve } = await createBox(u, { name: "Reserva de emergência", target: 1500000, color: "#16a34a", icon: "piggy-bank" });
  const { id: trip } = await createBox(u, { name: "Viagem", target: 600000, color: "#0284c7", icon: "plane" });
  for (let i = 0; i < 5; i++) {
    const d = toISODate(dateOnly(addMonths(first, i).getUTCFullYear(), addMonths(first, i).getUTCMonth() + 1, 6));
    await moveBox(u, { boxId: reserve, accountId: checking, amount: 80000, date: d, direction: "deposit" });
    await moveBox(u, { boxId: trip, accountId: checking, amount: 40000, date: d, direction: "deposit" });
  }
  await createGoal(u, { name: "Viagem para o Chile", description: "Férias de julho", target: 600000, startDate: toISODate(first), targetDate: toISODate(addMonths(start, 8)), priority: "high", category: "Viagem", savingsBoxId: trip });
  await createGoal(u, { name: "Reserva de 6 meses", target: 1500000, startDate: toISODate(first), priority: "medium", category: "Segurança", savingsBoxId: reserve });
  const month = monthKey(t);
  await setBudget(u, { categoryId: food, month, limit: 80000 });
  await setBudget(u, { categoryId: leisure, month, limit: 30000 });
  await setBudget(u, { categoryId: transport, month, limit: 30000 });

  console.log(`Usuário de demonstração pronto: ${EMAIL} / demo12345`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
