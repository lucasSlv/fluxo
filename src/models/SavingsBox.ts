import { Schema, type InferSchemaType } from "mongoose";
import { centsOptional, defineModel } from "./_helpers";

/** Caixinha. Saldo = depósitos − retiradas (transactions savings_*). */
const SavingsBoxSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    target: { ...centsOptional, default: null },
    color: { type: String, default: "#111111" },
    icon: { type: String, default: "piggy-bank" },
    archived: { type: Boolean, default: false },
  },
  { timestamps: true },
);
SavingsBoxSchema.index({ userId: 1, archived: 1 });

export type SavingsBoxDoc = InferSchemaType<typeof SavingsBoxSchema>;
export const SavingsBox = defineModel("SavingsBox", SavingsBoxSchema);
