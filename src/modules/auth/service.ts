import "server-only";
import { connectDB } from "@/lib/db";
import { AppError, isDuplicateKey } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { Category, User } from "@/models";
import { DEFAULT_CATEGORIES } from "@/modules/categories/defaults";
import { dummyHash, hashPassword, verifyPassword } from "./password";
import { rateLimit, resetRateLimit } from "./rate-limit";
import { changePasswordSchema, loginSchema, registerSchema } from "./schemas";
import type { z } from "zod";

export async function registerUser(input: z.input<typeof registerSchema>, ip: string) {
  const data = registerSchema.parse(input);
  await rateLimit(`register:${ip}`, 5, 3600);
  await connectDB();
  try {
    const user = await User.create({ name: data.name, email: data.email, passwordHash: await hashPassword(data.password) });
    await Category.insertMany(DEFAULT_CATEGORIES.map((c) => ({ ...c, userId: user._id })));
    logger.info("auth.register", { userId: String(user._id) });
    return { id: String(user._id) };
  } catch (err) {
    if (isDuplicateKey(err)) throw new AppError("CONFLICT", "Este e-mail já está cadastrado.", { email: "E-mail já cadastrado" });
    throw err;
  }
}

/** Retorna o id do usuário ou lança erro genérico (não revela se o e-mail existe). */
export async function authenticate(input: z.input<typeof loginSchema>, ip: string): Promise<string> {
  const data = loginSchema.parse(input);
  await rateLimit(`login:ip:${ip}`, 30, 900);
  await rateLimit(`login:email:${data.email}`, 8, 900);
  await connectDB();
  const user = await User.findOne({ email: data.email }).select("+passwordHash").lean();
  const ok = await verifyPassword(user?.passwordHash ?? (await dummyHash()), data.password);
  if (!user || !ok) {
    logger.warn("auth.login_failed", { email: data.email, ip });
    throw new AppError("UNAUTHORIZED", "E-mail ou senha incorretos.");
  }
  await resetRateLimit(`login:email:${data.email}`);
  logger.info("auth.login", { userId: String(user._id) });
  return String(user._id);
}

export async function changePassword(userId: string, input: z.input<typeof changePasswordSchema>) {
  const data = changePasswordSchema.parse(input);
  await rateLimit(`password:${userId}`, 5, 900);
  await connectDB();
  const user = await User.findById(userId).select("+passwordHash");
  if (!user) throw new AppError("UNAUTHORIZED", "Usuário não encontrado.");
  if (!(await verifyPassword(user.passwordHash, data.currentPassword))) {
    throw new AppError("VALIDATION", "Senha atual incorreta.", { currentPassword: "Senha atual incorreta" });
  }
  user.passwordHash = await hashPassword(data.newPassword);
  user.passwordChangedAt = new Date();
  await user.save();
}
