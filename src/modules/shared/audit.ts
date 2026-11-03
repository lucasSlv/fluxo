import "server-only";
import type { Types } from "mongoose";
import { AuditLog } from "@/models";
import { logger } from "@/lib/logger";

type Action = "create" | "update" | "delete" | "status";

const PICK = ["kind", "description", "amount", "date", "dueDate", "status", "paidAt", "categoryId", "accountId", "toAccountId", "creditCardId", "savingsBoxId", "nature", "limit", "initialBalance", "target", "name"];

function snapshot(doc: Record<string, unknown> | null | undefined) {
  if (!doc) return null;
  const out: Record<string, unknown> = {};
  for (const k of PICK) if (k in doc) out[k] = doc[k];
  return out;
}

/** Registra alterações financeiras relevantes. Nunca derruba a operação principal. */
export async function audit(userId: string, entity: string, entityId: string | Types.ObjectId, action: Action, before?: object | null, after?: object | null) {
  try {
    await AuditLog.create({ userId, entity, entityId, action, before: snapshot(before as Record<string, unknown>), after: snapshot(after as Record<string, unknown>) });
  } catch (err) {
    logger.error("audit.fail", { err, entity, action });
  }
}
