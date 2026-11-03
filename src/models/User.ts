import { Schema, type InferSchemaType } from "mongoose";
import { defineModel } from "./_helpers";

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, lowercase: true, trim: true, unique: true },
    passwordHash: { type: String, required: true, select: false },
    passwordChangedAt: { type: Date },
    preferences: {
      currency: { type: String, default: "BRL" },
      dateFormat: { type: String, enum: ["dd/MM/yyyy", "yyyy-MM-dd"], default: "dd/MM/yyyy" },
      timezone: { type: String, default: "America/Sao_Paulo" },
      alertThresholds: { type: [Number], default: [50, 75, 90, 100] },
      dueSoonDays: { type: Number, default: 5 },
    },
  },
  { timestamps: true },
);

export type UserDoc = InferSchemaType<typeof UserSchema>;
export const User = defineModel("User", UserSchema);
