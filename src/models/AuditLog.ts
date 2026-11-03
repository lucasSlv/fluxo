import { Schema } from "mongoose";
import { defineModel } from "./_helpers";

/** Histórico de alterações financeiras relevantes. */
const AuditLogSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    entity: { type: String, required: true },
    entityId: { type: Schema.Types.ObjectId, required: true },
    action: { type: String, enum: ["create", "update", "delete", "status"], required: true },
    before: { type: Schema.Types.Mixed, default: null },
    after: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
AuditLogSchema.index({ userId: 1, entity: 1, entityId: 1, createdAt: -1 });

export const AuditLog = defineModel("AuditLog", AuditLogSchema);
