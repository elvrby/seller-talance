// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const url = req.nextUrl;

  // Paksa http di localhost (hindari ERR_SSL_PROTOCOL_ERROR saat dev)
  if ((url.hostname === "localhost" || url.hostname === "127.0.0.1") && url.protocol === "https:") {
    const to = url.clone();
    to.protocol = "http:";
    return NextResponse.redirect(to);
  }

  // Proteksi reset-password: wajib ada mode=resetPassword & oobCode
  if (url.pathname === "/account/reset-password") {
    const m = url.searchParams.get("mode");
    const c = url.searchParams.get("oobCode");
    if (m !== "resetPassword" || !c) {
      const to = url.clone();
      to.pathname = "/";
      to.search = "";
      return NextResponse.redirect(to);
    }
  }

  // Proteksi halaman verify-email: wajib punya cookie sesi
  if (url.pathname === "/account/verify-email") {
    const sid = req.cookies.get("ve_sid")?.value;
    if (!sid) {
      const to = url.clone();
      to.pathname = "/";
      to.search = "";
      return NextResponse.redirect(to);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/account/reset-password", "/account/verify-email", "/:path*"],
};
