// middleware.ts (root project)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const { pathname, searchParams } = url;

  if (pathname === "/account/reset-password") {
    const mode = searchParams.get("mode");
    const oobCode = searchParams.get("oobCode");
    if (mode !== "resetPassword" || !oobCode) {
      const to = url.clone();
      to.pathname = "/";
      to.search = "";
      return NextResponse.redirect(to);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/account/reset-password"],
};
