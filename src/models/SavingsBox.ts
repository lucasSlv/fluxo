import { Schema, type InferSchemaType } from "mongoose";
import { centsOptional, defineModel } from "./_helpers";

/**
 * Caixinha. Saldo = saldo inicial + depósitos − retiradas (transactions savings_*).
 * O saldo inicial representa dinheiro que já estava guardado antes do cadastro: não sai de nenhuma conta
 * e não é receita nem despesa (mesmo conceito do saldo inicial de uma conta).
 */
const SavingsBoxSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    target: { ...centsOptional, default: null },
    initialBalance: { type: Number, default: 0, min: 0, validate: { validator: Number.isInteger, message: "Valor deve ser inteiro (centavos)" } },
    color: { type: String, default: "#111111" },
    icon: { type: String, default: "piggy-bank" },
    archived: { type: Boolean, default: false },
  },
  { timestamps: true },
);
SavingsBoxSchema.index({ userId: 1, archived: 1 });

export type SavingsBoxDoc = InferSchemaType<typeof SavingsBoxSchema>;
export const SavingsBox = defineModel("SavingsBox", SavingsBoxSchema);
