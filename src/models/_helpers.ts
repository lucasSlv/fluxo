import { Schema, model, models, type Model } from "mongoose";

export const cents = { type: Number, required: true, validate: { validator: Number.isInteger, message: "Valor deve ser inteiro (centavos)" } };
export const centsOptional = { type: Number, validate: { validator: (v: unknown) => v == null || Number.isInteger(v), message: "Valor deve ser inteiro (centavos)" } };
export const ref = (name: string, required = false) => ({ type: Schema.Types.ObjectId, ref: name, required, index: false });

/** Evita "OverwriteModelError" em hot reload. */
export function defineModel<T>(name: string, schema: Schema<T>): Model<T> {
  return (models[name] as Model<T>) ?? model<T>(name, schema);
}
