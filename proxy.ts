git add .
git commit -m "Finalize results archive and production routing"
git push origin mainimport { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Keep the results homepage.
  if (pathname === "/") {
    return NextResponse.next();
  }

  // Keep admin pages accessible.
  if (pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  // Keep the feedback page accessible.
  if (pathname === "/feedback") {
    return NextResponse.next();
  }

  // Every other public URL goes back to the results homepage.
  const url = request.nextUrl.clone();
  url.pathname = "/";
  url.search = "";

  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
  ],
};
