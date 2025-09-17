// app/api/auth/start-email-otp/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/libs/firebase/admin";
import { mailer } from "@/libs/email/mailer";
import crypto from "crypto";

const OTP_TTL_MS = 10 * 60 * 1000; // 10 menit
const COOKIE_NAME = "ve_sid";

function makeCode(): string {
  const n = crypto.randomInt(0, 1_000_000);
  return String(n).padStart(6, "0");
}
function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export async function POST(req: Request) {
  try {
    const { idToken } = await req.json();
    if (!idToken) {
      return NextResponse.json({ error: "Missing idToken" }, { status: 401 });
    }

    // Verifikasi user peminta
    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;
    const email = decoded.email;
    const name = decoded.name;

    if (!email) {
      return NextResponse.json({ error: "Email tidak tersedia pada akun" }, { status: 400 });
    }

    // ⬇️ 1) HAPUS SEMUA OTP SESSION LAMA UNTUK UID INI
    const oldSnap = await adminDb.collection("emailOtpSessions").where("uid", "==", uid).get();

    if (!oldSnap.empty) {
      // batched delete (maks 500 per batch)
      let batch = adminDb.batch();
      let count = 0;
      oldSnap.forEach((doc) => {
        batch.delete(doc.ref);
        count++;
        if (count === 450) {
          // commit per 450 untuk aman
          batch.commit();
          batch = adminDb.batch();
          count = 0;
        }
      });
      await batch.commit();
    }

    // 2) Generate OTP baru + buat sesi baru
    const code = makeCode();
    const salt = crypto.randomBytes(16).toString("hex");
    const codeHash = sha256(salt + code);
    const sid = crypto.randomBytes(24).toString("hex"); // session id (cookie)

    const now = Date.now();
    await adminDb
      .collection("emailOtpSessions")
      .doc(sid)
      .set({
        uid,
        email,
        codeHash,
        salt,
        tries: 0,
        expiresAt: now + OTP_TTL_MS,
        createdAt: now,
        userAgent: req.headers.get("user-agent") || null,
      });

    // 3) Kirim email OTP
    const html = `
      <p>Halo ${name || "Pengguna"},</p>
      <p>Kode verifikasi email Anda:</p>
      <p style="font-size:22px;font-weight:700;letter-spacing:4px">${code}</p>
      <p>Berlaku selama 10 menit. Jangan bagikan kepada siapa pun.</p>
    `;
    await mailer.sendMail({
      to: email,
      subject: "Kode Verifikasi Email",
      html,
      text: `Kode verifikasi Anda: ${code} (berlaku 10 menit)`,
    });

    // 4) Set cookie sesi (menimpa cookie lama bila ada)
    const res = NextResponse.json({ ok: true });
    res.cookies.set({
      name: COOKIE_NAME,
      value: sid,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production", // di localhost: false
      path: "/",
      maxAge: OTP_TTL_MS / 1000,
    });
    return res;
  } catch (e: any) {
    console.error("[start-email-otp] error:", e?.code || e?.name, e?.message);
    return NextResponse.json({ error: "Gagal memulai verifikasi email" }, { status: 500 });
  }
}
