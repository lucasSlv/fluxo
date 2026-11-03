import { Schema, type InferSchemaType } from "mongoose";
import { cents, defineModel } from "./_helpers";

/**
 * Objetivo financeiro. O valor acumulado vem da caixinha vinculada (quando houver)
 * ou das contribuições manuais registradas em `contributions`.
 */
const GoalSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, maxlength: 500, default: "" },
    target: { ...cents, min: 1 },
    startDate: { type: Date, required: true },
    targetDate: { type: Date, default: null },
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    category: { type: String, trim: true, maxlength: 40, default: "" },
    status: { type: String, enum: ["active", "achieved", "paused", "cancelled"], default: "active" },
    savingsBoxId: { type: Schema.Types.ObjectId, ref: "SavingsBox", default: null },
    contributions: [
      {
        amount: { type: Number, required: true, validate: Number.isInteger },
        date: { type: Date, required: true },
        note: { type: String, default: "" },
      },
    ],
  },
  { timestamps: true },
);
GoalSchema.index({ userId: 1, status: 1 });

export type GoalDoc = InferSchemaType<typeof GoalSchema>;
export const Goal = defineModel("Goal", GoalSchema);
