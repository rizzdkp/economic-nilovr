import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  verifySessionToken,
} from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/logout"];

/** Sliding session: setiap akses valid memperpanjang masa berlaku 30 hari (spec §1). */
function withRenewedSession(response: NextResponse): NextResponse {
  response.cookies.set(SESSION_COOKIE_NAME, createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
  return response;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isValid = verifySessionToken(token);

  if (pathname === "/login") {
    if (isValid) {
      return withRenewedSession(NextResponse.redirect(new URL("/", request.url)));
    }
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  if (isValid) {
    return withRenewedSession(NextResponse.next());
  }

  if (pathname.startsWith("/api")) {
    return NextResponse.json(
      { success: false, message: "Sesi tidak valid, silakan login kembali." },
      { status: 401 },
    );
  }

  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
