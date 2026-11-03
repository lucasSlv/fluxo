import { Schema, type InferSchemaType } from "mongoose";
import { defineModel } from "./_helpers";

const CategorySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true, maxlength: 50 },
    kind: { type: String, enum: ["income", "expense"], required: true },
    icon: { type: String, default: "tag" },
    color: { type: String, default: "#6b7280" },
    parentId: { type: Schema.Types.ObjectId, ref: "Category", default: null },
    system: { type: String, default: null }, // categorias técnicas: "card_invoice", "debt"
    archived: { type: Boolean, default: false },
  },
  { timestamps: true },
);
CategorySchema.index({ userId: 1, kind: 1, parentId: 1, name: 1 }, { unique: true, partialFilterExpression: { archived: false } });

export type CategoryDoc = InferSchemaType<typeof CategorySchema>;
export const Category = defineModel("Category", CategorySchema);
