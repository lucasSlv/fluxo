import { Schema, type InferSchemaType } from "mongoose";
import { cents, defineModel } from "./_helpers";

/** Limite mensal por categoria. Um documento por mês preserva o histórico. */
const BudgetSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    month: { type: String, required: true, match: /^\d{4}-\d{2}$/ },
    limit: cents,
  },
  { timestamps: true },
);
BudgetSchema.index({ userId: 1, month: 1, categoryId: 1 }, { unique: true });

export type BudgetDoc = InferSchemaType<typeof BudgetSchema>;
export const Budget = defineModel("Budget", BudgetSchema);
