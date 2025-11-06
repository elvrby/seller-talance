// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const url = req.nextUrl;

  // Paksa http di localhost (hindari ERR_SSL_PROTOCOL_ERROR saat dev)
  if (
    (url.hostname === "localhost" || url.hostname === "127.0.0.1") &&
    url.protocol === "https:"
  ) {
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

  // ⚠️ Santunin proteksi verify-email:
  // - Banyak kasus redirect ke "/" terjadi karena cookie ve_sid telat/failed set.
  // - Daripada hard-block di middleware, biarkan halaman /account/verify-email sendiri
  //   yang nge-guard via auth & logic (sudah kamu pasang).
  //
  // Jika kamu TETAP ingin hard-protect pakai cookie sesi,
  // set ke "soft gate": hanya kalau TIDAK ada ve_sid DAN TIDAK ada query "allow".
  if (url.pathname === "/account/verify-email") {
    const sid = req.cookies.get("ve_sid")?.value;
    const allow = url.searchParams.get("allow");
    if (!sid && !allow) {
      // Jangan lempar ke "/" karena bisa memicu guard lain → kirim ke sign-in aja.
      const to = url.clone();
      to.pathname = "/account/sign-in";
      to.search = "";
      return NextResponse.redirect(to);
    }
  }

  return NextResponse.next();
}

// ⬇️ Persempit matcher: hilangkan "/:path*"
export const config = {
  matcher: ["/account/reset-password", "/account/verify-email"],
};
