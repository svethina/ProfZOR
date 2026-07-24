import { auth } from "@/auth";
import { NextResponse } from "next/server";

/**
 * Next.js 16: файл proxy.ts (вместо middleware.ts).
 * Auth.js wrapper: req.auth содержит сессию (database strategy).
 * Защищает /dashboard и /my-prompts.
 */
export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;
  const isProtected =
    pathname.startsWith("/dashboard") || pathname.startsWith("/my-prompts");

  if (isProtected && !req.auth?.user) {
    const login = new URL("/login", req.nextUrl.origin);
    login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/my-prompts/:path*"],
};
