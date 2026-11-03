import { Schema, type InferSchemaType } from "mongoose";
import { cents, defineModel } from "./_helpers";

import { PAYMENT_METHODS, TX_KINDS, TX_STATUS } from "@/lib/constants";
export { PAYMENT_METHODS, TX_KINDS, TX_STATUS };
export type { TxKind, TxStatus } from "@/lib/constants";

const TransactionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    kind: { type: String, enum: TX_KINDS, required: true },
    description: { type: String, required: true, trim: true, maxlength: 140 },
    amount: { ...cents, min: 1 },
    date: { type: Date, required: true }, // data de competência (date-only)
    dueDate: { type: Date, default: null }, // vencimento (date-only)
    paidAt: { type: Date, default: null },
    status: { type: String, enum: TX_STATUS, required: true, default: "paid" },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", default: null },
    accountId: { type: Schema.Types.ObjectId, ref: "Account", default: null },
    toAccountId: { type: Schema.Types.ObjectId, ref: "Account", default: null },
    creditCardId: { type: Schema.Types.ObjectId, ref: "CreditCard", default: null },
    invoiceMonth: { type: String, default: null }, // "YYYY-MM" da fatura (compras e pagamentos de cartão)
    savingsBoxId: { type: Schema.Types.ObjectId, ref: "SavingsBox", default: null },
    debtId: { type: Schema.Types.ObjectId, ref: "Debt", default: null },
    recurrenceId: { type: Schema.Types.ObjectId, ref: "Recurrence", default: null },
    occurrenceDate: { type: Date, default: null }, // data "original" da ocorrência (chave de idempotência)
    overridden: { type: Boolean, default: false }, // ocorrência editada individualmente
    installment: {
      groupId: { type: Schema.Types.ObjectId, default: null },
      number: { type: Number, default: null },
      total: { type: Number, default: null },
    },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, default: null },
    nature: { type: String, enum: ["fixed", "variable"], default: "variable" },
    notes: { type: String, maxlength: 1000, default: "" },
    attachments: [
      {
        fileId: { type: Schema.Types.ObjectId, required: true },
        filename: String,
        contentType: String,
        size: Number,
      },
    ],
  },
  { timestamps: true },
);

TransactionSchema.index({ userId: 1, date: -1 });
TransactionSchema.index({ userId: 1, kind: 1, status: 1, date: -1 });
TransactionSchema.index({ userId: 1, accountId: 1, date: -1 });
TransactionSchema.index({ userId: 1, toAccountId: 1 }, { partialFilterExpression: { toAccountId: { $type: "objectId" } } });
TransactionSchema.index({ userId: 1, categoryId: 1, date: -1 });
TransactionSchema.index({ userId: 1, status: 1, dueDate: 1 });
TransactionSchema.index({ userId: 1, creditCardId: 1, invoiceMonth: 1 }, { partialFilterExpression: { creditCardId: { $type: "objectId" } } });
TransactionSchema.index({ userId: 1, debtId: 1 }, { partialFilterExpression: { debtId: { $type: "objectId" } } });
TransactionSchema.index({ userId: 1, savingsBoxId: 1 }, { partialFilterExpression: { savingsBoxId: { $type: "objectId" } } });
// Idempotência da geração de recorrências: uma ocorrência por (recorrência, data).
TransactionSchema.index(
  { recurrenceId: 1, occurrenceDate: 1 },
  { unique: true, partialFilterExpression: { recurrenceId: { $type: "objectId" } } },
);
TransactionSchema.index({ userId: 1, description: "text" });

export type TransactionDoc = InferSchemaType<typeof TransactionSchema>;
export const Transaction = defineModel("Transaction", TransactionSchema);
