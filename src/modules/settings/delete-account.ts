import "server-only";
import { GridFSBucket, ObjectId } from "mongodb";
import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { Account, AuditLog, Budget, Category, CreditCard, Debt, Goal, RateLimit, Recurrence, SavingsBox, Session, Transaction, User } from "@/models";
import { verifyPassword } from "@/modules/auth/password";
import { rateLimit } from "@/modules/auth/rate-limit";

export const DELETE_CONFIRMATION = "EXCLUIR";

export const deleteAccountSchema = z.object({
  password: z.string().min(1, "Informe sua senha"),
  confirmation: z.string().refine((v) => v.trim().toUpperCase() === DELETE_CONFIRMATION, `Digite ${DELETE_CONFIRMATION} para confirmar`),
});
export type DeleteAccountInput = z.input<typeof deleteAccountSchema>;

/** Todas as coleções com dados do usuário (exceto o próprio usuário, removido por último). */
const USER_COLLECTIONS = [Transaction, Recurrence, Budget, Debt, Goal, SavingsBox, CreditCard, Category, Account, AuditLog, Session] as unknown as mongoose.Model<unknown>[];

/**
 * Exclui definitivamente a conta e TODO o histórico do usuário: movimentações, contas, cartões,
 * dívidas, objetivos, caixinhas, categorias, limites, recorrências, anexos, auditoria e sessões.
 * Exige a senha atual. O usuário é removido por último: se algo falhar no meio, a operação pode
 * ser repetida com segurança. O e-mail fica livre para um novo cadastro.
 */
export async function deleteUserAccount(userId: string, input: DeleteAccountInput) {
  const data = deleteAccountSchema.parse(input);
  await rateLimit(`delete-account:${userId}`, 5, 900);
  await connectDB();
  const user = await User.findById(userId).select("+passwordHash email").lean();
  if (!user) throw new AppError("UNAUTHORIZED", "Usuário não encontrado.");
  if (!(await verifyPassword(user.passwordHash, data.password))) {
    throw new AppError("VALIDATION", "Senha incorreta.", { password: "Senha incorreta" });
  }

  // Anexos (GridFS): arquivos e seus pedaços.
  const bucket = new GridFSBucket(mongoose.connection.db!, { bucketName: "attachments" });
  const files = await bucket.find({ "metadata.userId": new ObjectId(userId) }).toArray();
  for (const f of files) await bucket.delete(f._id);

  const counts: Record<string, number> = {};
  for (const M of USER_COLLECTIONS) counts[M.modelName] = (await M.deleteMany({ userId })).deletedCount ?? 0;
  await RateLimit.deleteMany({ key: { $in: [`login:email:${user.email}`, `password:${userId}`, `delete-account:${userId}`] } });
  await User.deleteOne({ _id: userId });

  logger.warn("account.deleted", { userId, attachments: files.length, ...counts });
}
