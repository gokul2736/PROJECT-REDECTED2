import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Paths that must be locked down now that the event has ended
  const lockedPaths = [
    "/rounds",
    "/lobby",
    "/investigation",
    "/login",
    "/register",
  ];

  const isLocked = lockedPaths.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isLocked) {
    const redirectUrl = new URL("/", request.url);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/rounds/:path*",
    "/lobby/:path*",
    "/investigation/:path*",
    "/login",
    "/register",
  ],
};
