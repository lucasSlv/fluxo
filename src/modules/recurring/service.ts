import "server-only";
import { connectDB } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { addMonths, monthRange, monthKey, today } from "@/lib/dates";
import { logger } from "@/lib/logger";
import { Category, Recurrence, Transaction } from "@/models";
import { ensureAccountUsable } from "@/modules/accounts/service";
import { oid } from "@/modules/ledger/rules";
import { audit } from "@/modules/shared/audit";
import { assertOwned } from "@/modules/shared/ownership";
import { monthlyEquivalent, occurrenceDates } from "./rules";
import { recurrenceSchema, type RecurrenceInput } from "./schemas";
import type { Frequency } from "@/models/Recurrence";

/** Gera ocorrências até o fim do mês seguinte. */
export function generationHorizon(tz: string): Date {
  return monthRange(monthKey(addMonths(today(tz), 1))).to;
}

type RecDoc = Awaited<ReturnType<typeof Recurrence.findOne>> & {};

/**
 * Idempotente: usa upsert com $setOnInsert sobre a chave única (recurrenceId, occurrenceDate).
 * Ocorrências canceladas ou editadas individualmente nunca são recriadas/sobrescritas.
 */
async function generateFor(rec: NonNullable<RecDoc>, from: Date, until: Date): Promise<number> {
  const dates = occurrenceDates(
    { startDate: rec.startDate, endDate: rec.endDate, frequency: rec.frequency as Frequency, dueDay: rec.dueDay },
    from,
    until,
  );
  if (!dates.length) return 0;
  const ops = dates.map((d) => ({
    updateOne: {
      filter: { recurrenceId: rec._id, occurrenceDate: d },
      update: {
        $setOnInsert: {
          userId: rec.userId,
          recurrenceId: rec._id,
          occurrenceDate: d,
          kind: rec.kind,
          description: rec.description,
          amount: rec.amount,
          date: d,
          dueDate: d,
          status: "pending",
          categoryId: rec.categoryId,
          accountId: rec.accountId,
          paymentMethod: rec.paymentMethod,
          nature: "fixed",
          notes: "",
        },
      },
      upsert: true,
    },
  }));
  try {
    const r = await Transaction.bulkWrite(ops, { ordered: false });
    return r.upsertedCount;
  } catch (err) {
    // Corridas concorrentes podem gerar E11000 — as ocorrências já existem, então é seguro ignorar.
    if ((err as { code?: number }).code === 11000) return 0;
    throw err;
  }
}

/** Garante que todas as recorrências ativas estejam geradas até o horizonte. Barato quando já estão. */
export async function ensureRecurrencesGenerated(userId: string, tz: string): Promise<void> {
  await connectDB();
  const horizon = generationHorizon(tz);
  const recs = await Recurrence.find({ userId, status: "active", $or: [{ generatedUntil: null }, { generatedUntil: { $lt: horizon } }] });
  for (const rec of recs) {
    const created = await generateFor(rec, rec.startDate, horizon);
    rec.generatedUntil = horizon;
    await rec.save();
    if (created) logger.info("recurrence.generated", { recurrenceId: String(rec._id), created });
  }
}

async function validateRefs(userId: string, data: ReturnType<typeof recurrenceSchema.parse>) {
  await ensureAccountUsable(userId, data.accountId);
  const cat = await assertOwned(Category, userId, data.categoryId, "Categoria");
  if (cat.kind !== data.kind) throw new AppError("VALIDATION", "A categoria não corresponde ao tipo.", { categoryId: "Categoria incompatível" });
}

export async function createRecurrence(userId: string, input: RecurrenceInput, tz: string) {
  const data = recurrenceSchema.parse(input);
  await connectDB();
  await validateRefs(userId, data);
  const rec = await Recurrence.create({ ...data, userId });
  await audit(userId, "recurrence", rec._id, "create", null, rec.toObject());
  await ensureRecurrencesGenerated(userId, tz);
  return { id: String(rec._id) };
}

/**
 * Altera a configuração e aplica às próximas ocorrências (a partir de hoje) que ainda estão
 * pendentes e não foram editadas individualmente. Histórico pago permanece intacto.
 */
export async function updateRecurrence(userId: string, id: string, input: RecurrenceInput, tz: string) {
  const data = recurrenceSchema.parse(input);
  await connectDB();
  const rec = await Recurrence.findOne({ _id: id, userId });
  if (!rec) throw new AppError("NOT_FOUND", "Recorrência não encontrada.");
  await validateRefs(userId, data);
  const before = rec.toObject();
  const scheduleChanged =
    rec.frequency !== data.frequency ||
    rec.dueDay !== data.dueDay ||
    +rec.startDate !== +data.startDate ||
    +(rec.endDate ?? 0) !== +(data.endDate ?? 0);
  rec.set(data);
  const t = today(tz);
  const futureFilter = { userId, recurrenceId: rec._id, status: "pending", overridden: false, occurrenceDate: { $gte: t } };
  if (scheduleChanged) {
    await Transaction.deleteMany(futureFilter);
    rec.generatedUntil = null;
  } else {
    await Transaction.updateMany(futureFilter, {
      $set: { description: data.description, amount: data.amount, categoryId: data.categoryId, accountId: data.accountId, paymentMethod: data.paymentMethod },
    });
  }
  await rec.save();
  await audit(userId, "recurrence", id, "update", before, data);
  if (rec.status === "active") await ensureRecurrencesGenerated(userId, tz);
}

/** Pausar/cancelar remove as próximas ocorrências pendentes; retomar volta a gerar a partir de hoje. */
export async function setRecurrenceStatus(userId: string, id: string, status: "active" | "paused" | "cancelled", tz: string) {
  await connectDB();
  const rec = await Recurrence.findOne({ _id: id, userId });
  if (!rec) throw new AppError("NOT_FOUND", "Recorrência não encontrada.");
  if (rec.status === "cancelled") throw new AppError("VALIDATION", "Recorrência cancelada não pode ser reativada.");
  const t = today(tz);
  const before = rec.status;
  if (status !== "active") {
    await Transaction.deleteMany({ userId, recurrenceId: rec._id, status: "pending", overridden: false, occurrenceDate: { $gte: t } });
    if (status === "cancelled") rec.endDate = t;
  } else if (before === "paused") {
    // Retomar: não recria pendências passadas do período pausado.
    rec.startDate = t > rec.startDate ? t : rec.startDate;
  }
  rec.status = status;
  rec.generatedUntil = null;
  await rec.save();
  await audit(userId, "recurrence", id, "status", { status: before }, { status });
  if (status === "active") await ensureRecurrencesGenerated(userId, tz);
}

export async function listRecurrences(userId: string) {
  await connectDB();
  const recs = await Recurrence.find({ userId }).sort({ status: 1, dueDay: 1 }).populate("categoryId", "name icon color").populate("accountId", "name").lean();
  const stats = await Transaction.aggregate<{ _id: unknown; paid: number; pending: number; lastPaid: Date | null; next: Date | null }>([
    { $match: { userId: oid(userId), recurrenceId: { $in: recs.map((r) => r._id) } } },
    {
      $group: {
        _id: "$recurrenceId",
        paid: { $sum: { $cond: [{ $eq: ["$status", "paid"] }, 1, 0] } },
        pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
        lastPaid: { $max: { $cond: [{ $eq: ["$status", "paid"] }, "$date", null] } },
        next: { $min: { $cond: [{ $eq: ["$status", "pending"] }, "$date", null] } },
      },
    },
  ]);
  return recs.map((r) => {
    const s = stats.find((x) => String(x._id) === String(r._id));
    return { ...r, id: String(r._id), monthly: monthlyEquivalent(r.amount, r.frequency as Frequency), paidCount: s?.paid ?? 0, pendingCount: s?.pending ?? 0, lastPaid: s?.lastPaid ?? null, next: s?.next ?? null };
  });
}

/** Histórico de ocorrências (pagas, pendentes e canceladas). */
export async function recurrenceOccurrences(userId: string, id: string) {
  await connectDB();
  await assertOwned(Recurrence, userId, id, "Recorrência");
  return Transaction.find({ userId, recurrenceId: id }).sort({ occurrenceDate: -1 }).limit(120).lean();
}

/** Comprometimento mensal com recorrências ativas (despesas). */
export async function monthlyRecurringCommitment(userId: string) {
  await connectDB();
  const recs = await Recurrence.find({ userId, status: "active", kind: "expense" }).select("amount frequency").lean();
  return recs.reduce((s, r) => s + monthlyEquivalent(r.amount, r.frequency as Frequency), 0);
}
