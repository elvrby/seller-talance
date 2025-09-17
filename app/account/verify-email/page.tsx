// app/account/verify-email/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { firebaseAuth as auth } from "@/libs/firebase/config";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function VerifyEmailPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [userReady, setUserReady] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        router.replace("/account/sign-in");
        return;
      }
      setUserReady(true);
    });
    return () => unsub();
  }, [router]);

  const onVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);

    const otp = code.trim();
    if (!/^\d{6}$/.test(otp)) {
      setErr("Masukkan 6 digit kode OTP.");
      return;
    }

    setLoading(true);
    try {
      const u = auth.currentUser;
      if (!u) throw new Error("Not signed in");
      const idToken = await u.getIdToken();

      const res = await fetch("/api/auth/verify-email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: otp, idToken }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data?.error || "Gagal memverifikasi kode");
        return;
      }

      // 🔄 Paksa refresh user dan token supaya emailVerified ter-update di client
      await u.reload();
      await u.getIdToken(true);

      setMsg("Email berhasil diverifikasi! Mengalihkan…");
      setTimeout(() => router.replace("/"), 900);
    } catch {
      setErr("Gagal memverifikasi kode");
    } finally {
      setLoading(false);
    }
  };

  if (!userReady) return null;

  return (
    <main className="min-h-[calc(100vh-64px)] bg-white">
      <div className="mx-auto max-w-md px-4 py-10">
        <h1 className="text-2xl font-semibold text-gray-900">Verifikasi Email</h1>
        <p className="mt-1 text-sm text-gray-500">Masukkan 6 digit kode yang kami kirim ke email Anda.</p>

        <form onSubmit={onVerify} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Kode OTP</label>
            <input
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="6 digit"
              className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-gray-900 outline-none focus:border-gray-900 tracking-[0.4em]"
            />
          </div>

          {err && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
          {msg && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{msg}</div>}

          <button type="submit" disabled={loading || code.trim().length !== 6} className="w-full rounded-xl bg-gray-900 px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-60">
            {loading ? "Memverifikasi..." : "Verifikasi"}
          </button>
        </form>

        <div className="mt-6 text-sm">
          <button
            className="underline underline-offset-4 text-gray-700 hover:text-gray-900"
            onClick={async () => {
              try {
                const u = auth.currentUser;
                if (!u) return;
                const idToken = await u.getIdToken();
                const res = await fetch("/api/auth/start-email-otp", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ idToken }),
                });
                if (!res.ok) throw new Error();
                setMsg("Kode baru telah dikirim. Cek inbox/spam.");
                setErr(null);
              } catch {
                setErr("Gagal mengirim ulang kode.");
                setMsg(null);
              }
            }}
          >
            Kirim ulang kode
          </button>
        </div>
      </div>
    </main>
  );
}
