import { z } from "zod";
import { FREQUENCIES, PAYMENT_METHODS } from "@/lib/constants";
import { amountCents, dateOnlyString, objectId, optionalDate, text } from "@/modules/shared/validation";

export const recurrenceSchema = z
  .object({
    kind: z.enum(["income", "expense"]),
    description: text(140).min(1, "Informe a descrição"),
    amount: amountCents,
    categoryId: objectId,
    accountId: objectId,
    paymentMethod: z.enum(PAYMENT_METHODS).nullish().transform((v) => v ?? null),
    frequency: z.enum(FREQUENCIES),
    startDate: dateOnlyString,
    endDate: optionalDate,
    dueDay: z.coerce.number().int().min(1, "Dia inválido").max(31, "Dia inválido"),
    notes: text(500).optional().default(""),
  })
  .refine((v) => !v.endDate || v.endDate >= v.startDate, { path: ["endDate"], message: "A data final deve ser após a inicial" });
export type RecurrenceInput = z.input<typeof recurrenceSchema>;
