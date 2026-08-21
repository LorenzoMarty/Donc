import { jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";

const protectedRoutes = [
  "/dashboard",
  "/aulas",
  "/games",
  "/redacao",
  "/redacoes",
  "/perfil",
  "/admin",
  "/onboarding",
];
const authRoutes = ["/login", "/cadastro", "/recuperar-senha"];

// Mesmo segredo do backend (backend/src/config/settings.py `jwt_secret_key`) — validado aqui pra
// que um cookie forjado ou expirado não passe indefinidamente (antes só checava presença do
// cookie, nunca assinatura/exp). Nunca exposto ao browser: só lido em código de servidor (proxy).
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;

async function hasValidSession(token: string | undefined): Promise<boolean> {
  if (!token || !JWT_SECRET_KEY) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(JWT_SECRET_KEY));
    return true;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("access_token")?.value;
  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));
  const isAuth = authRoutes.some((route) => pathname.startsWith(route));

  if (!isProtected && !isAuth) {
    return NextResponse.next();
  }

  const authenticated = await hasValidSession(token);

  if (isProtected && !authenticated) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    if (token) response.cookies.delete("access_token");
    return response;
  }

  if (isAuth && authenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
