import "server-only";
import type { Model } from "mongoose";
import { isValidObjectId } from "mongoose";
import { notFound } from "@/lib/errors";

/** Garante que o documento existe e pertence ao usuário. Toda referência vinda do cliente passa por aqui. */
export async function assertOwned<T>(model: Model<T>, userId: string, id: string | null | undefined, label: string) {
  if (!id || !isValidObjectId(id)) throw notFound(label);
  const doc = await model.findOne({ _id: id, userId }).lean();
  if (!doc) throw notFound(label);
  return doc;
}
