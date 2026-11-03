import { Schema } from "mongoose";
import { defineModel } from "./_helpers";

const RateLimitSchema = new Schema({
  key: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
});
RateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RateLimit = defineModel("RateLimit", RateLimitSchema);
