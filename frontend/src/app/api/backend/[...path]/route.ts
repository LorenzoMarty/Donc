import { NextRequest, NextResponse } from "next/server";

import { getInternalApiUrl } from "@/lib/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

async function forward(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  const internalApiUrl = getInternalApiUrl();
  const targetPath = path.map((segment) => encodeURIComponent(segment)).join("/");
  const targetUrl = new URL(`${internalApiUrl}/${targetPath}`);
  request.nextUrl.searchParams.forEach((value, key) => {
    targetUrl.searchParams.set(key, value);
  });

  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  const authorization = request.headers.get("authorization");
  const cookie = request.headers.get("cookie");

  if (contentType) headers.set("content-type", contentType);
  if (authorization) headers.set("authorization", authorization);
  if (cookie) headers.set("cookie", cookie);

  const response = await fetch(targetUrl, {
    method: request.method,
    headers,
    body: ["GET", "HEAD"].includes(request.method) ? undefined : await request.text(),
    cache: "no-store",
  });

  const responseHeaders = new Headers(response.headers);
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("transfer-encoding");
  responseHeaders.delete("content-length");

  // `new Headers(response.headers)` acima colapsa múltiplos `Set-Cookie` (login/register mandam
  // cookies de sessão + CSRF) num só, ou perde todos — gotcha conhecido do Fetch API/undici.
  // `getSetCookie()` preserva cada um; reconstrói explicitamente.
  responseHeaders.delete("set-cookie");
  for (const cookie of response.headers.getSetCookie()) {
    responseHeaders.append("set-cookie", cookie);
  }

  // Sem isso, a Vercel injeta `Cache-Control: public, max-age=0, must-revalidate` por padrão em
  // respostas de Serverless Function sem cache-control próprio — e a rede de edge da Vercel some
  // com o `Set-Cookie` em respostas marcadas como cacheáveis (`public`), mesmo com max-age=0. Esse
  // proxy carrega toda a API (autenticada, por usuário) — nunca deve ser cacheado.
  responseHeaders.set("cache-control", "private, no-store, must-revalidate");

  return new NextResponse(response.body, {
    status: response.status,
    headers: responseHeaders,
  });
}

export async function GET(request: NextRequest, context: RouteContext) {
  return forward(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return forward(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return forward(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return forward(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return forward(request, context);
}
