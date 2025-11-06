// app/api/auth/verify-reset-otp/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getAdmin } from "@/libs/firebase/admin";
import bcrypt from "bcryptjs";

const MAX_ATTEMPTS = 5;

export async function POST(req: Request) {
  try {
    const { email, otp, newPassword } = await req.json();
    if (!email || !otp || !newPassword) {
      return NextResponse.json(
        { error: "Data tidak lengkap" },
        { status: 400 }
      );
    }

    const { adminApp, adminAuth } = getAdmin();
    const db = adminApp.firestore();

    // Ambil dokumen OTP terbaru untuk email tsb yang belum used
    const snap = await db
      .collection("email_reset_otps")
      .where("emailLower", "==", email.toLowerCase())
      .where("used", "==", false)
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();

    if (snap.empty) {
      // Jawaban generik
      return NextResponse.json(
        { error: "OTP tidak valid atau kadaluarsa" },
        { status: 400 }
      );
    }

    const doc = snap.docs[0];
    const data = doc.data() as any;

    // Cek TTL
    if (Date.now() > data.expiresAt) {
      await doc.ref.update({ used: true });
      return NextResponse.json(
        { error: "OTP tidak valid atau kadaluarsa" },
        { status: 400 }
      );
    }

    // Cek attempts
    if ((data.attempts ?? 0) >= MAX_ATTEMPTS) {
      await doc.ref.update({ used: true });
      return NextResponse.json(
        { error: "OTP diblokir, minta kode baru" },
        { status: 400 }
      );
    }

    // Verifikasi hash
    const ok = await bcrypt.compare(otp, data.otpHash);
    if (!ok) {
      await doc.ref.update({ attempts: (data.attempts ?? 0) + 1 });
      return NextResponse.json({ error: "OTP salah" }, { status: 400 });
    }

    // OTP valid → update password via Admin SDK
    // (Tanpa autentikasi user aktif, ini satu-satunya cara)
    let uid: string | null = null;
    try {
      const user = await adminAuth.getUserByEmail(email);
      uid = user.uid;
    } catch {
      // Jangan bocorkan bahwa user tidak ada
      await doc.ref.update({ used: true });
      return NextResponse.json({ ok: true }); // generik
    }

    await adminAuth.updateUser(uid!, { password: newPassword });

    // Tandai used agar tidak bisa dipakai lagi (replay-safe)
    await doc.ref.update({ used: true });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[verify-reset-otp] error:", e?.code || e?.name, e?.message);
    return NextResponse.json(
      { ok: false, error: "Gagal memproses permintaan" },
      { status: 500 }
    );
  }
}
