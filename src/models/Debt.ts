import { Schema, type InferSchemaType } from "mongoose";
import { cents, defineModel } from "./_helpers";

import { DEBT_KINDS } from "@/lib/constants";
export { DEBT_KINDS };

/** Dívida. As parcelas são `transactions` (kind=expense, debtId). */
const DebtSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    creditor: { type: String, trim: true, maxlength: 80, default: "" },
    kind: { type: String, enum: DEBT_KINDS, default: "other" },
    totalAmount: { ...cents, min: 1 },
    installmentsCount: { type: Number, min: 1, max: 600, required: true },
    installmentAmount: { ...cents, min: 1 },
    interestRate: { type: Number, default: null }, // % ao mês
    contractDate: { type: Date, required: true },
    firstDueDate: { type: Date, required: true },
    accountId: { type: Schema.Types.ObjectId, ref: "Account", required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", default: null },
    paidBefore: { type: Number, default: 0 }, // parcelas já pagas antes do cadastro (não afetam saldos)
    status: { type: String, enum: ["active", "paid_off", "cancelled"], default: "active" },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);
DebtSchema.index({ userId: 1, status: 1 });

export type DebtDoc = InferSchemaType<typeof DebtSchema>;
export const Debt = defineModel("Debt", DebtSchema);
