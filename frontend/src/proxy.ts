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
// Acesso 100% pago (sem trial/gratis) — checkout/paywall/gestao de assinatura ficam fora do
// gate de assinatura de `protectedRoutes` (senao ninguem bloqueado conseguiria chegar aqui pra
// resolver), mas ainda exigem sessao valida.
const SUBSCRIPTION_ROUTE = "/assinatura";

// Mesmo segredo do backend (backend/src/config/settings.py `jwt_secret_key`) — validado aqui pra
// que um cookie forjado ou expirado não passe indefinidamente (antes só checava presença do
// cookie, nunca assinatura/exp). Nunca exposto ao browser: só lido em código de servidor (proxy).
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;

type Session = { valid: boolean; isAdmin: boolean; subscriptionActive: boolean };

async function readSession(token: string | undefined): Promise<Session> {
  if (!token || !JWT_SECRET_KEY) return { valid: false, isAdmin: false, subscriptionActive: false };
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(JWT_SECRET_KEY));
    return {
      valid: true,
      isAdmin: payload.role === "admin",
      // Claim `sa` gravada no token pelo backend (AuthService.token_for) — pode ficar defasada
      // ate o token expirar depois de um webhook mudar o status real; o backend recalcula de
      // verdade a cada request (require_active_subscription), isto aqui e so UX de redirect.
      subscriptionActive: payload.sa === true,
    };
  } catch {
    return { valid: false, isAdmin: false, subscriptionActive: false };
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("access_token")?.value;
  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));
  const isAuth = authRoutes.some((route) => pathname.startsWith(route));
  const isSubscriptionRoute = pathname.startsWith(SUBSCRIPTION_ROUTE);

  if (!isProtected && !isAuth && !isSubscriptionRoute) {
    return NextResponse.next();
  }

  const session = await readSession(token);

  if ((isProtected || isSubscriptionRoute) && !session.valid) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    if (token) response.cookies.delete("access_token");
    return response;
  }

  const blockedBySubscription = isProtected && !isSubscriptionRoute && !session.isAdmin && !session.subscriptionActive;
  if (blockedBySubscription) {
    return NextResponse.redirect(new URL(SUBSCRIPTION_ROUTE, request.url));
  }

  if (isAuth && session.valid) {
    const destination = !session.isAdmin && !session.subscriptionActive ? SUBSCRIPTION_ROUTE : "/dashboard";
    return NextResponse.redirect(new URL(destination, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
