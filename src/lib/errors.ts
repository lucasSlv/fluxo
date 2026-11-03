import { ZodError } from "zod";
import { logger } from "./logger";

export type ErrorCode = "VALIDATION" | "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "RATE_LIMITED" | "INTERNAL";

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const notFound = (what = "Registro") => new AppError("NOT_FOUND", `${what} não encontrado.`);
export const invalid = (message: string, fieldErrors?: Record<string, string>) => new AppError("VALIDATION", message, fieldErrors);

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; code: ErrorCode; error: string; fieldErrors?: Record<string, string> };

export const httpStatus: Record<ErrorCode, number> = {
  VALIDATION: 422,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

export function zodFieldErrors(err: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** Converte qualquer erro em um resultado serializável e seguro para o cliente. */
export function toErrorResult(err: unknown): Extract<ActionResult, { ok: false }> {
  if (err instanceof AppError) return { ok: false, code: err.code, error: err.message, fieldErrors: err.fieldErrors };
  if (err instanceof ZodError) return { ok: false, code: "VALIDATION", error: "Verifique os campos destacados.", fieldErrors: zodFieldErrors(err) };
  if (isDuplicateKey(err)) return { ok: false, code: "CONFLICT", error: "Já existe um registro com esses dados." };
  logger.error("unhandled_error", { err });
  return { ok: false, code: "INTERNAL", error: "Erro inesperado. Tente novamente." };
}

export function isDuplicateKey(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: number }).code === 11000;
}
