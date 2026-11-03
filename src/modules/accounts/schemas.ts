import { z } from "zod";
import { ACCOUNT_TYPES } from "@/lib/constants";
import { hexColor, signedCents, text } from "@/modules/shared/validation";

export const accountSchema = z.object({
  name: text(60).min(1, "Informe o nome"),
  type: z.enum(ACCOUNT_TYPES),
  institution: text(60).optional().default(""),
  initialBalance: signedCents,
  color: hexColor.default("#111111"),
});
export type AccountInput = z.input<typeof accountSchema>;

export const ACCOUNT_TYPE_LABEL: Record<(typeof ACCOUNT_TYPES)[number], string> = {
  checking: "Conta corrente",
  savings: "Poupança",
  cash: "Dinheiro",
  wallet: "Carteira digital",
  investment: "Investimentos",
};
