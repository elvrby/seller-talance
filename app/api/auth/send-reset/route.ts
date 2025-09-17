import { NextResponse } from "next/server";
import { adminAuth } from "@/libs/firebase/admin";
import { sendMail } from "@/libs/email/mailer";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

function resetEmailHtml(link: string, email?: string) {
  return `
    <p>Halo${email ? " " + email : ""},</p>
    <p>Gunakan tautan berikut untuk mengatur ulang password Anda:</p>
    <p><a href="${link}" target="_blank" rel="noopener">Reset Password</a></p>
    <p>Jika Anda tidak meminta ini, abaikan email ini.</p>
  `;
}

export async function POST(req: Request) {
  try {
    const { email, continueUrl } = await req.json();
    if (!email) return NextResponse.json({ error: "Email diperlukan" }, { status: 400 });

    const url = `${APP_URL}/account/reset-password?continueUrl=${encodeURIComponent(continueUrl || `${APP_URL}/account/sign-in`)}`;

    const link = await adminAuth.generatePasswordResetLink(email, {
      url,
      handleCodeInApp: true,
    });

    const info = await sendMail({
      to: email,
      subject: "Reset Password Akun Anda",
      html: resetEmailHtml(link, email),
      text: `Reset password: ${link}`,
    });

    return NextResponse.json({ ok: true, messageId: info.messageId });
  } catch (e: any) {
    console.error("[send-reset] error:", e?.code || e?.name, e?.message);
    return NextResponse.json({ ok: false, error: "Gagal mengirim email reset" }, { status: 500 });
  }
}
