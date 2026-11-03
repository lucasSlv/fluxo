import { Schema, type InferSchemaType } from "mongoose";
import { defineModel } from "./_helpers";

const SessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    userAgent: String,
    ip: String,
    lastUsedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);
// O MongoDB remove automaticamente sessões expiradas.
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type SessionDoc = InferSchemaType<typeof SessionSchema>;
export const Session = defineModel("Session", SessionSchema);
