// app/account/forget-password/page.tsx
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { sendPasswordResetEmail } from "firebase/auth";
import type { FirebaseError } from "firebase/app";
import { firebaseAuth as auth } from "@/libs/firebase/config";

export default function ForgetPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);

    const value = email.trim();
    if (!value) {
      setErr("Masukkan email Anda terlebih dahulu.");
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, value);
      // Pesan netral: tidak mengonfirmasi ada/tidaknya akun (anti-enumeration)
      setMsg("Jika email terdaftar, kami telah mengirim tautan reset password. Periksa inbox/spam.");
    } catch (e) {
      const code = (e as FirebaseError)?.code ?? "unknown";
      if (code === "auth/invalid-email") {
        setErr("Format email tidak valid.");
      } else {
        // tetap netral untuk keamanan
        setMsg("Jika email terdaftar, kami telah mengirim tautan reset password. Periksa inbox/spam.");
      }
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

          <button type="submit" disabled={loading} className="w-full rounded-xl bg-gray-900 px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-60">
            {loading ? "Mengirim..." : "Kirim Tautan Reset"}
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

        <div className="mt-6 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
          <p>
            Catatan: jika Anda masuk menggunakan <b>Google</b> atau <b>Nomor HP</b>, reset password tidak diperlukan. Gunakan metode tersebut di halaman{" "}
            <Link href="/account/sign-in" className="underline">
              Masuk
            </Link>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
