import { z } from "zod";
import { PAYMENT_METHODS } from "@/lib/constants";
import { amountCents, dateOnlyString, optionalDate, optionalObjectId, text } from "@/modules/shared/validation";

export const transactionSchema = z
  .object({
    kind: z.enum(["income", "expense", "transfer"]),
    description: text(140).min(1, "Informe a descrição"),
    amount: amountCents,
    date: dateOnlyString,
    dueDate: optionalDate,
    status: z.enum(["pending", "paid"]).default("paid"),
    categoryId: optionalObjectId,
    accountId: optionalObjectId,
    toAccountId: optionalObjectId,
    paymentMethod: z.enum(PAYMENT_METHODS).nullish().transform((v) => v ?? null),
    nature: z.enum(["fixed", "variable"]).default("variable"),
    notes: text(1000).optional().default(""),
  })
  .superRefine((v, ctx) => {
    if (!v.accountId) ctx.addIssue({ code: "custom", path: ["accountId"], message: "Selecione a conta" });
    if (v.kind === "transfer") {
      if (!v.toAccountId) ctx.addIssue({ code: "custom", path: ["toAccountId"], message: "Selecione a conta de destino" });
      if (v.toAccountId && v.toAccountId === v.accountId) ctx.addIssue({ code: "custom", path: ["toAccountId"], message: "Escolha uma conta diferente da origem" });
    } else if (!v.categoryId) {
      ctx.addIssue({ code: "custom", path: ["categoryId"], message: "Selecione a categoria" });
    }
  });
export type TransactionInput = z.input<typeof transactionSchema>;

const csv = <const T extends readonly [string, ...string[]]>(values: T) =>
  z
    .string()
    .optional()
    .transform((v) => (v ? v.split(",").filter(Boolean) : []))
    .pipe(z.array(z.enum(values)));

/** Filtros da listagem (vindos da URL). */
export const listFiltersSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  kind: csv(["income", "expense", "transfer", "card_payment", "savings_deposit", "savings_withdrawal"]),
  status: csv(["pending", "paid", "cancelled", "overdue"]),
  categoryId: z.string().optional(),
  accountId: z.string().optional(),
  cardId: z.string().optional(),
  nature: z.enum(["fixed", "variable"]).optional(),
  min: z.coerce.number().int().optional(),
  max: z.coerce.number().int().optional(),
  q: z.string().trim().max(80).optional(),
  sort: z.enum(["date_desc", "date_asc", "amount_desc", "amount_asc"]).default("date_desc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(100).default(20),
});
export type ListFilters = z.output<typeof listFiltersSchema>;

export const KIND_LABEL: Record<string, string> = {
  income: "Receita",
  expense: "Despesa",
  transfer: "Transferência",
  card_payment: "Pagamento de fatura",
  savings_deposit: "Depósito em caixinha",
  savings_withdrawal: "Retirada de caixinha",
};

export const PAYMENT_LABEL: Record<string, string> = {
  pix: "Pix",
  debit: "Débito",
  credit: "Crédito",
  cash: "Dinheiro",
  boleto: "Boleto",
  transfer: "Transferência",
  other: "Outro",
};
