import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow the Results page itself
  if (pathname === "/results") {
    return NextResponse.next();
  }

  // Keep all admin routes accessible
  if (pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  // Everything else → Results
  const url = request.nextUrl.clone();
  url.pathname = "/results";

  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
  ],
};