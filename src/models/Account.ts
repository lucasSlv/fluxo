import { Schema, type InferSchemaType } from "mongoose";
import { cents, defineModel } from "./_helpers";

import { ACCOUNT_TYPES } from "@/lib/constants";
export { ACCOUNT_TYPES };

const AccountSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    type: { type: String, enum: ACCOUNT_TYPES, required: true },
    institution: { type: String, trim: true, maxlength: 60 },
    initialBalance: { ...cents, default: 0 },
    color: { type: String, default: "#111111" },
    archived: { type: Boolean, default: false },
  },
  { timestamps: true },
);
AccountSchema.index({ userId: 1, archived: 1, name: 1 });

export type AccountDoc = InferSchemaType<typeof AccountSchema>;
export const Account = defineModel("Account", AccountSchema);
