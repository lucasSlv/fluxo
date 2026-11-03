import { describe, expect, it } from "vitest";
import { Category, User } from "@/models";
import { authenticate, changePassword, registerUser } from "@/modules/auth/service";

describe("auth", () => {
  it("registers with hashed password and default categories", async () => {
    const { id } = await registerUser({ name: "Ana", email: "Ana@Test.dev", password: "segredo123" }, "1.1.1.1");
    const u = await User.findById(id).select("+passwordHash").lean();
    expect(u!.email).toBe("ana@test.dev");
    expect(u!.passwordHash).toMatch(/^\$argon2id\$/);
    expect(await Category.countDocuments({ userId: id })).toBeGreaterThan(10);
    await expect(registerUser({ name: "Ana", email: "ana@test.dev", password: "segredo123" }, "1.1.1.2")).rejects.toThrow(/cadastrado/);
  });

  it("rejects weak passwords", async () => {
    await expect(registerUser({ name: "Bob", email: "b@t.dev", password: "123" }, "1.1.1.3")).rejects.toThrow();
  });

  it("authenticates and rate-limits repeated failures", async () => {
    await registerUser({ name: "Cid", email: "cid@t.dev", password: "segredo123" }, "2.2.2.2");
    expect(await authenticate({ email: "cid@t.dev", password: "segredo123" }, "2.2.2.2")).toBeTruthy();
    for (let i = 0; i < 8; i++) await expect(authenticate({ email: "cid@t.dev", password: "errada000" }, "2.2.2.2")).rejects.toThrow(/incorretos/);
    await expect(authenticate({ email: "cid@t.dev", password: "segredo123" }, "2.2.2.2")).rejects.toThrow(/Muitas tentativas/);
  });

  it("does not reveal whether the email exists", async () => {
    await expect(authenticate({ email: "ninguem@t.dev", password: "x" }, "3.3.3.3")).rejects.toThrow("E-mail ou senha incorretos.");
  });

  it("changes password only with the current one", async () => {
    const { id } = await registerUser({ name: "Dan", email: "dan@t.dev", password: "segredo123" }, "4.4.4.4");
    await expect(changePassword(id, { currentPassword: "errada", newPassword: "novaSenha1", confirm: "novaSenha1" })).rejects.toThrow(/incorreta/);
    await changePassword(id, { currentPassword: "segredo123", newPassword: "novaSenha1", confirm: "novaSenha1" });
    expect(await authenticate({ email: "dan@t.dev", password: "novaSenha1" }, "4.4.4.4")).toBe(id);
  });
});
