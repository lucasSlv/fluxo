import { NextResponse, type NextRequest } from "next/server";

const PUBLIC = ["/login", "/register"];

/**
 * Checagem otimista: só verifica a presença do cookie. A validação real ocorre no servidor (DAL).
 * Usuários já autenticados em /login são redirecionados pela própria página (após validar a sessão),
 * evitando loops com cookies expirados.
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = req.cookies.has("fluxo_session");
  const isPublic = PUBLIC.some((p) => pathname.startsWith(p));
  if (!hasSession && !isPublic && !pathname.startsWith("/api")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|jpg|ico)$).*)"],
};
