// app/account/forget-password/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

// Cooldown lokal agar UI tidak spam
const COOLDOWN_MS = 60_000; // 60 detik
const COOLDOWN_KEY = "fp:lastResetAt";

function resolveBaseUrl() {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  let base = raw || (typeof window !== "undefined" ? window.location.origin : "");
  try {
    const u = new URL(base);
    if (u.hostname === "localhost" || u.hostname === "127.0.0.1") {
      u.protocol = "http:";
    }
    base = u.toString().replace(/\/$/, "");
  } catch {
    // ignore
  }
  return base;
}

export default function ForgetPasswordPage() {
  const search = useSearchParams();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Cooldown
  const [now, setNow] = useState<number>(() => Date.now());
  const [lastAt, setLastAt] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    const raw = window.localStorage.getItem(COOLDOWN_KEY);
    return raw ? Number(raw) : 0;
  });
  const remainingMs = Math.max(0, lastAt + COOLDOWN_MS - now);
  const remainingSec = Math.ceil(remainingMs / 1000);
  const cooldownActive = remainingMs > 0;

  // Prefill email dari query ?email=
  useEffect(() => {
    const e = search.get("email");
    if (e) setEmail(e);
  }, [search]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const baseUrl = useMemo(resolveBaseUrl, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);

    const value = email.trim();
    if (!value) {
      setErr("Masukkan email Anda terlebih dahulu.");
      return;
    }
    if (cooldownActive) {
      setErr(`Terlalu sering. Coba lagi dalam ${remainingSec} detik.`);
      return;
    }

    setLoading(true);
    try {
      // Panggil API server → generatePasswordResetLink + kirim via Gmail SMTP
      await fetch("/api/auth/send-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: value,
          continueUrl: `${baseUrl}/account/sign-in`,
        }),
      });

      // Set cooldown lokal
      const ts = Date.now();
      setLastAt(ts);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(COOLDOWN_KEY, String(ts));
      }

      // Pesan netral (anti-enumeration)
      setMsg("Jika email terdaftar, kami telah mengirim tautan reset password. Periksa inbox/spam.");
    } catch (e) {
      // Untuk keamanan, tetap tampilkan pesan netral
      setMsg("Jika email terdaftar, kami telah mengirim tautan reset password. Periksa inbox/spam.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-64px)] bg-white">
      <div className="mx-auto max-w-md px-4 py-10">
        <h1 className="text-2xl font-semibold text-gray-900">Reset Password</h1>
        <p className="mt-1 text-sm text-gray-500">Masukkan email yang Anda gunakan. Kami akan mengirim tautan untuk mengatur ulang password.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@domain.com"
              className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-gray-900 outline-none focus:border-gray-900"
            />
          </div>

          {err && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
          {msg && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{msg}</div>}

          <button
            type="submit"
            disabled={loading || !email.trim() || cooldownActive}
            className="w-full rounded-xl bg-gray-900 px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-60"
            title={cooldownActive ? `Tunggu ${remainingSec} detik sebelum mencoba lagi` : undefined}
          >
            {loading ? "Mengirim..." : cooldownActive ? `Tunggu ${remainingSec} detik…` : "Kirim Tautan Reset"}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between text-sm">
          <Link href="/account/sign-in" className="text-gray-700 underline underline-offset-4 hover:text-gray-900">
            Kembali ke Masuk
          </Link>
          <Link href="/account/sign-up" className="text-gray-700 underline underline-offset-4 hover:text-gray-900">
            Daftar akun baru
          </Link>
        </div>

        {/* Debug dev */}
        {process.env.NODE_ENV !== "production" && (
          <div className="mt-6 rounded-lg bg-slate-50 p-3 text-xs text-slate-600 space-y-1">
            <div>
              Resolved baseUrl: <code className="bg-slate-200 px-1 rounded">{baseUrl}</code>
            </div>
            <div className="text-[11px]">
              Pastikan domain ini ada di <i>Firebase Auth → Settings → Authorized domains</i> (mis. <b>localhost</b>).
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
