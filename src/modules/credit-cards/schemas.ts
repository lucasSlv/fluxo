import { z } from "zod";
import { amountCents, centsAllowZero, dateOnlyString, hexColor, monthKeySchema, objectId, optionalObjectId, text } from "@/modules/shared/validation";

export const cardSchema = z.object({
  name: text(60).min(1, "Informe o nome"),
  institution: text(60).optional().default(""),
  limit: centsAllowZero,
  closingDay: z.coerce.number().int().min(1, "Dia inválido").max(31, "Dia inválido"),
  dueDay: z.coerce.number().int().min(1, "Dia inválido").max(31, "Dia inválido"),
  color: hexColor.default("#111111"),
  defaultAccountId: optionalObjectId,
});
export type CardInput = z.input<typeof cardSchema>;

export const purchaseSchema = z.object({
  cardId: objectId,
  description: text(140).min(1, "Informe a descrição"),
  amount: amountCents,
  date: dateOnlyString,
  installments: z.coerce.number().int().min(1, "Mínimo 1").max(48, "Máximo 48 parcelas").default(1),
  categoryId: objectId,
  nature: z.enum(["fixed", "variable"]).default("variable"),
  notes: text(1000).optional().default(""),
});
export type PurchaseInput = z.input<typeof purchaseSchema>;

export const invoicePaymentSchema = z.object({
  cardId: objectId,
  invoiceMonth: monthKeySchema,
  accountId: objectId,
  amount: amountCents,
  date: dateOnlyString,
});
export type InvoicePaymentInput = z.input<typeof invoicePaymentSchema>;
