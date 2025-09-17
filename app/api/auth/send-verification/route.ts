// app/api/auth/send-verification/route.ts
export const runtime = "nodejs"; // ⬅️ pastikan Node runtime (Nodemailer butuh Node APIs)
export const dynamic = "force-dynamic"; // ⬅️ jangan kecache

import { NextResponse } from "next/server";
import { adminAuth } from "@/libs/firebase/admin";
import { mailer } from "@/libs/email/mailer";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

function html(link: string, displayName?: string) {
  const name = displayName || "Pengguna";
  return `
    <p>Halo ${name},</p>
    <p>Silakan verifikasi email Anda dengan klik tautan berikut:</p>
    <p><a href="${link}" target="_blank" rel="noopener">Verifikasi Email</a></p>
    <p>Jika Anda tidak meminta ini, abaikan email ini.</p>
  `;
}

export async function POST(req: Request) {
  try {
    const { email, displayName, continueUrl } = await req.json();
    if (!email) return NextResponse.json({ error: "Email diperlukan" }, { status: 400 });

    const targetUrl = `${APP_URL}/account/verify-email?continueUrl=${encodeURIComponent(continueUrl || `${APP_URL}/account/sign-in`)}`;

    // 1) Generate verification link
    let link: string;
    try {
      link = await adminAuth.generateEmailVerificationLink(email, {
        url: targetUrl,
        handleCodeInApp: true,
      });
    } catch (e: any) {
      console.error("[send-verification] generate error:", e?.code || e?.name, e?.message);
      return NextResponse.json({ ok: false, stage: "generate", code: e?.code || e?.name, message: e?.message }, { status: 500 });
    }

    // 2) Kirim email via SMTP
    try {
      const info = await mailer.sendMail({
        to: email,
        subject: "Verifikasi Email Anda",
        html: html(link, displayName),
        text: `Verifikasi email Anda: ${link}`,
      });
      return NextResponse.json({ ok: true, messageId: info.messageId });
    } catch (e: any) {
      console.error("[send-verification] send error:", e?.code || e?.name, e?.message, e?.response);
      return NextResponse.json({ ok: false, stage: "send", code: e?.code || e?.name, message: e?.message }, { status: 500 });
    }
  } catch (e: any) {
    console.error("[send-verification] unknown error:", e?.message);
    return NextResponse.json({ ok: false, message: "unknown error" }, { status: 500 });
  }
}
