import { Schema, type InferSchemaType } from "mongoose";
import { cents, defineModel } from "./_helpers";

const CreditCardSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    institution: { type: String, trim: true, maxlength: 60, default: "" },
    limit: { ...cents, min: 0 },
    closingDay: { type: Number, min: 1, max: 31, required: true },
    dueDay: { type: Number, min: 1, max: 31, required: true },
    color: { type: String, default: "#111111" },
    defaultAccountId: { type: Schema.Types.ObjectId, ref: "Account", default: null },
    archived: { type: Boolean, default: false },
  },
  { timestamps: true },
);
CreditCardSchema.index({ userId: 1, archived: 1 });

export type CreditCardDoc = InferSchemaType<typeof CreditCardSchema>;
export const CreditCard = defineModel("CreditCard", CreditCardSchema);
