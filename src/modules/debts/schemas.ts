import { z } from "zod";
import { DEBT_KINDS } from "@/lib/constants";
import { amountCents, dateOnlyString, objectId, optionalObjectId, text } from "@/modules/shared/validation";

export const debtSchema = z
  .object({
    name: text(80).min(1, "Informe o nome"),
    creditor: text(80).optional().default(""),
    kind: z.enum(DEBT_KINDS).default("other"),
    installmentsCount: z.coerce.number().int().min(1, "Mínimo 1").max(600, "Máximo 600"),
    installmentAmount: amountCents,
    paidBefore: z.coerce.number().int().min(0).default(0),
    interestRate: z.coerce.number().min(0).max(100).nullish().transform((v) => v ?? null),
    contractDate: dateOnlyString,
    firstDueDate: dateOnlyString,
    accountId: objectId,
    categoryId: optionalObjectId,
    notes: text(500).optional().default(""),
  })
  .refine((v) => v.paidBefore < v.installmentsCount, { path: ["paidBefore"], message: "Deve ser menor que o total de parcelas" });
export type DebtInput = z.input<typeof debtSchema>;

export const debtUpdateSchema = z.object({
  name: text(80).min(1, "Informe o nome"),
  creditor: text(80).optional().default(""),
  kind: z.enum(DEBT_KINDS),
  interestRate: z.coerce.number().min(0).max(100).nullish().transform((v) => v ?? null),
  accountId: objectId,
  notes: text(500).optional().default(""),
});
export type DebtUpdateInput = z.input<typeof debtUpdateSchema>;

export const extraPaymentSchema = z.object({ amount: amountCents, date: dateOnlyString, accountId: objectId });

export const DEBT_KIND_LABEL: Record<(typeof DEBT_KINDS)[number], string> = {
  loan: "Empréstimo",
  financing: "Financiamento",
  installment_purchase: "Compra parcelada",
  personal: "Dívida pessoal",
  agreement: "Acordo",
  other: "Outra",
};
