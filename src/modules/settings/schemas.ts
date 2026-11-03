import { z } from "zod";
import { emailSchema } from "@/modules/auth/schemas";

export const CURRENCIES = ["BRL", "USD", "EUR"] as const;

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome").max(80),
  email: emailSchema,
});
export type ProfileInput = z.input<typeof profileSchema>;

const isTimeZone = (tz: string) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

export const preferencesSchema = z.object({
  currency: z.enum(CURRENCIES).default("BRL"),
  dateFormat: z.enum(["dd/MM/yyyy", "yyyy-MM-dd"]),
  timezone: z.string().refine(isTimeZone, "Fuso horário inválido"),
  alertThresholds: z
    .array(z.number().int().min(1, "Mínimo 1%").max(100, "Máximo 100%"))
    .min(1, "Escolha ao menos um alerta")
    .max(6)
    .transform((a) => [...new Set(a)].sort((x, y) => x - y)),
  dueSoonDays: z.coerce.number().int().min(0).max(30, "Máximo 30 dias"),
});
export type PreferencesInput = z.input<typeof preferencesSchema>;
