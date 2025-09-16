// app/account/reset-password/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { verifyPasswordResetCode, confirmPasswordReset } from "firebase/auth";
import type { FirebaseError } from "firebase/app";
import { firebaseAuth as auth } from "@/libs/firebase/config";
import PasswordField from "@/app/components/ui/PasswordField";

export default function ResetPasswordPage() {
  const router = useRouter();
  const search = useSearchParams();

  const oobCode = search.get("oobCode");
  const mode = search.get("mode"); // harus 'resetPassword'
  const continueUrl = search.get("continueUrl"); // opsional

  const [stage, setStage] = useState<"checking" | "form" | "done">("checking");
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Cek link & redirect jika invalid/kurang parameter
  useEffect(() => {
    async function check() {
      if (!oobCode || mode !== "resetPassword") {
        router.replace("/");
        return;
      }
      try {
        const em = await verifyPasswordResetCode(auth, oobCode);
        setEmail(em);
        setStage("form");
      } catch {
        router.replace("/"); // token invalid/expired -> kembali ke home
      }
    }
    check();
  }, [oobCode, mode, router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oobCode) return;

    setErr(null);
    if (password.length < 6) {
      setErr("Password minimal 6 karakter.");
      return;
    }
    if (password !== password2) {
      setErr("Konfirmasi password tidak cocok.");
      return;
    }

    setLoading(true);
    try {
      await confirmPasswordReset(auth, oobCode, password);
      setStage("done");
    } catch (e) {
      const code = (e as FirebaseError)?.code ?? "unknown";
      let msg = "Gagal mengatur ulang password. Coba lagi.";
      if (code === "auth/expired-action-code") msg = "Tautan reset password kedaluwarsa.";
      if (code === "auth/invalid-action-code") msg = "Tautan reset password tidak valid.";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-64px)] bg-white">
      <div className="mx-auto max-w-md px-4 py-10">
        <h1 className="text-2xl font-semibold text-gray-900">Atur Ulang Password</h1>
        <p className="mt-1 text-sm text-gray-500">Silakan buat password baru Anda.</p>

        {stage === "checking" && <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-700">Memeriksa tautan reset…</div>}

        {stage === "form" && (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input value={email ?? ""} readOnly className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900" />
            </div>

            <div>
              <PasswordField
                label="Password baru"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                id="reset-password-1"
                name="new_password"
                placeholder="min. 6 karakter"
                autoComplete="new-password"
              />
            </div>

            <div>
              <PasswordField
                label="Konfirmasi password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                id="reset-password-2"
                name="new_password_confirmation"
                placeholder="ulangi password baru"
                autoComplete="new-password"
              />
            </div>

            {err && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}

            <button type="submit" disabled={loading} className="w-full rounded-xl bg-gray-900 px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-60">
              {loading ? "Menyimpan..." : "Simpan Password Baru"}
            </button>

            {continueUrl && <p className="text-xs text-gray-500">Jika terdapat masalah atau error anda bisa menghubungi customer service</p>}
          </form>
        )}

        {stage === "done" && (
          <div className="mt-6 space-y-4">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Password berhasil diubah. Silakan masuk dengan password baru Anda.</div>
            <Link href="/account/sign-in" className="inline-flex items-center justify-center rounded-xl bg-gray-900 px-4 py-2 text-white hover:bg-gray-800">
              Masuk sekarang
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
