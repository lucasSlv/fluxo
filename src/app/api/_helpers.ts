import "server-only";
import { NextResponse } from "next/server";
import { AppError, httpStatus, toErrorResult } from "@/lib/errors";
import { getCurrentUser, type CurrentUser } from "@/modules/auth/dal";

/** Envelope de Route Handlers autenticados: 401 sem sessão, erros mapeados para status HTTP. */
export async function withUser(fn: (user: CurrentUser) => Promise<Response>): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError("UNAUTHORIZED", "Não autenticado.");
    return await fn(user);
  } catch (err) {
    const r = toErrorResult(err);
    return NextResponse.json({ error: r.error, code: r.code, fieldErrors: r.fieldErrors }, { status: httpStatus[r.code] });
  }
}

const centsToDecimal = (c: number) => (c / 100).toFixed(2).replace(".", ",");

export function csvCell(v: unknown): string {
  const s = v == null ? "" : typeof v === "number" ? centsToDecimal(v) : String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function csvResponse(rows: unknown[][], filename: string): Response {
  const body = "﻿" + rows.map((r) => r.map(csvCell).join(";")).join("\r\n");
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
