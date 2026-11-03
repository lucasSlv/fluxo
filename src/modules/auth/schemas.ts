import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email("E-mail inválido").max(120);
export const passwordSchema = z
  .string()
  .min(8, "A senha deve ter ao menos 8 caracteres")
  .max(128, "Senha muito longa")
  .regex(/[A-Za-z]/, "Inclua ao menos uma letra")
  .regex(/\d/, "Inclua ao menos um número");

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome").max(80),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Informe a senha").max(128),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Informe a senha atual"),
    newPassword: passwordSchema,
    confirm: z.string(),
  })
  .refine((v) => v.newPassword === v.confirm, { path: ["confirm"], message: "As senhas não conferem" });
