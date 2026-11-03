import { Category, User } from "@/models";
import { createAccount } from "@/modules/accounts/service";
import { DEFAULT_CATEGORIES } from "@/modules/categories/defaults";

export async function makeUser(email = `u${Math.random().toString(36).slice(2)}@test.dev`) {
  const user = await User.create({ name: "Teste", email, passwordHash: "x" });
  const userId = String(user._id);
  await Category.insertMany(DEFAULT_CATEGORIES.map((c) => ({ ...c, userId })));
  const cat = async (name: string, kind: "income" | "expense" = "expense") => String((await Category.findOne({ userId, name, kind }).lean())!._id);
  return { userId, cat };
}

export async function makeAccount(userId: string, initialBalance = 0, name = "Conta") {
  return (await createAccount(userId, { name, type: "checking", initialBalance, color: "#111111" })).id;
}
