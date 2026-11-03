import { z } from "zod";
import { parseDateOnly } from "@/lib/dates";

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Identificador inválido");
export const optionalObjectId = z
  .union([objectId, z.literal(""), z.null()])
  .optional()
  .transform((v) => (v ? v : null));

/** Centavos inteiros e positivos. */
export const amountCents = z
  .number({ error: "Informe o valor" })
  .int("Valor inválido")
  .positive("O valor deve ser maior que zero")
  .max(100_000_000_000, "Valor muito alto");

export const centsAllowZero = z.number({ error: "Informe o valor" }).int("Valor inválido").min(0, "Valor não pode ser negativo").max(100_000_000_000);
export const signedCents = z.number({ error: "Informe o valor" }).int("Valor inválido").min(-100_000_000_000).max(100_000_000_000);

/** "YYYY-MM-DD" -> Date date-only. */
export const dateOnlyString = z
  .string({ error: "Informe a data" })
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida")
  .transform((v, ctx) => {
    try {
      return parseDateOnly(v);
    } catch {
      ctx.addIssue({ code: "custom", message: "Data inválida" });
      return z.NEVER;
    }
  });

export const optionalDate = z
  .union([dateOnlyString, z.literal(""), z.null()])
  .optional()
  .transform((v) => (v instanceof Date ? v : null));

export const monthKeySchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Mês inválido");
export const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida");
export const text = (max: number) => z.string().trim().max(max, `Máximo de ${max} caracteres`);
