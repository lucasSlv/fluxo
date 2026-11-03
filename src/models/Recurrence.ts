import { Schema, type InferSchemaType } from "mongoose";
import { cents, defineModel } from "./_helpers";

import { FREQUENCIES } from "@/lib/constants";
export { FREQUENCIES };
export type { Frequency } from "@/lib/constants";

/** Configuração da recorrência. As ocorrências são documentos em `transactions`. */
const RecurrenceSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    kind: { type: String, enum: ["income", "expense"], required: true },
    description: { type: String, required: true, trim: true, maxlength: 140 },
    amount: { ...cents, min: 1 },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", default: null },
    accountId: { type: Schema.Types.ObjectId, ref: "Account", required: true },
    paymentMethod: { type: String, default: null },
    frequency: { type: String, enum: FREQUENCIES, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, default: null },
    dueDay: { type: Number, min: 1, max: 31, required: true },
    status: { type: String, enum: ["active", "paused", "cancelled"], default: "active" },
    generatedUntil: { type: Date, default: null },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);
RecurrenceSchema.index({ userId: 1, status: 1 });

export type RecurrenceDoc = InferSchemaType<typeof RecurrenceSchema>;
export const Recurrence = defineModel("Recurrence", RecurrenceSchema);
