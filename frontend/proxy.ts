import { NextResponse, type NextRequest } from "next/server";

const protectedRoutes = ["/dashboard", "/aulas", "/exercicios", "/redacao", "/redacoes", "/tutor", "/simulados", "/admin", "/onboarding"];
const authRoutes = ["/login", "/cadastro", "/recuperar-senha"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("access_token")?.value;
  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));
  const isAuth = authRoutes.some((route) => pathname.startsWith(route));

  if (isProtected && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAuth && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

