// app/account/forget-password/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { sendPasswordResetEmail } from "firebase/auth";
import type { FirebaseError } from "firebase/app";
import { firebaseAuth as auth } from "@/libs/firebase/config";

export default function ForgetPasswordPage() {
  const search = useSearchParams();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Prefill email jika ada ?email=...
  useEffect(() => {
    const e = search.get("email");
    if (e) setEmail(e);
  }, [search]);

  // Base URL: gunakan ENV jika ada; kalau dev dan ENV kosong/placeholder, pakai window.location.origin
  const rawEnvBase = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const isPlaceholder = rawEnvBase?.includes("your-domain.com");
  const baseUrl = useMemo(() => {
    if (typeof window === "undefined") return rawEnvBase || "";
    // Di dev, paksa pakai origin lokal kalau ENV kosong/placeholder
    if (!rawEnvBase || isPlaceholder) return window.location.origin;
    return rawEnvBase;
  }, [rawEnvBase, isPlaceholder]);

  const handlerUrl = useMemo(() => `${baseUrl}/account/reset-password?continueUrl=${encodeURIComponent(`${baseUrl}/account/sign-in`)}`, [baseUrl]);

  const handlerHost = useMemo(() => {
    try {
      return new URL(handlerUrl).host; // contoh: "localhost:3000"
    } catch {
      return "(url tidak valid)";
    }
  }, [handlerUrl]);

  // Tampilkan domain yang harus kamu allowlist di Firebase (tanpa port)
  const bareDomain = handlerHost.split(":")[0]; // "localhost" dari "localhost:3000"

  async function onSubmit(e: React.FormEvent) {
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
      await sendPasswordResetEmail(auth, value, {
        // Firebase akan MENAMBAHKAN ?mode=resetPassword&oobCode=XXXX ke URL ini
        url: handlerUrl,
        handleCodeInApp: true,
      });

      // Pesan netral (anti-enumeration)
      setMsg("Jika email terdaftar, kami telah mengirim tautan reset password. Periksa inbox/spam.");
    } catch (e) {
      const fe = e as FirebaseError;

      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.error("[forget-password] error:", fe.code, fe.message, {
          NEXT_PUBLIC_APP_URL: rawEnvBase,
          resolvedBaseUrl: baseUrl,
          handlerUrl,
          handlerHost,
          bareDomain,
          projectId: (auth?.app?.options?.projectId as string) || "(unknown)",
        });
      }

      const code = fe?.code ?? "unknown";
      switch (code) {
        case "auth/invalid-email":
          setErr("Format email tidak valid.");
          break;

        case "auth/missing-continue-uri":
          setErr("Konfigurasi tautan reset belum benar (continue URL kosong). Cek handlerUrl.");
          break;

        case "auth/invalid-continue-uri":
          setErr("Continue URL tidak valid. Periksa NEXT_PUBLIC_APP_URL atau handlerUrl.");
          break;

        case "auth/unauthorized-continue-uri": {
          // Inilah akar masalah: domain di handlerUrl belum di-allowlist
          setErr(`Domain belum diizinkan untuk project. Tambahkan "${bareDomain}" di Firebase Console → Authentication → Settings → Authorized domains. ` + `Jangan pakai protokol atau port.`);
          break;
        }

        case "auth/too-many-requests":
          setErr("Terlalu banyak percobaan dari perangkat ini. Coba lagi nanti.");
          break;

        default:
          // Tetap netral untuk pengguna
          setMsg("Jika email terdaftar, kami telah mengirim tautan reset password. Periksa inbox/spam.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-64px)] bg-white">
      <div className="mx-auto max-w-md px-4 py-10">
        <h1 className="text-2xl font-semibold text-gray-900">Forget Password</h1>
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

          <button type="submit" disabled={loading || !email.trim()} className="w-full rounded-xl bg-gray-900 px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-60">
            {loading ? "Mengirim..." : "Kirim Tautan Reset"}
          </button>
        </form>

        {/* Debug dev: bantu pastikan ENV dan domain benar */}
        {process.env.NODE_ENV !== "production" && (
          <div className="mt-6 rounded-lg bg-slate-50 p-3 text-xs text-slate-600 space-y-1">
            <div>Masukan gmail yang terdaftar pada colum di atas dan jika email terdaftar, maka pesan reset password akan dikirimkan melalui gmail</div>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between text-sm">
          <Link href="/account/sign-in" className="text-gray-700 underline underline-offset-4 hover:text-gray-900">
            Kembali ke Masuk
          </Link>
          <Link href="/account/sign-up" className="text-gray-700 underline underline-offset-4 hover:text-gray-900">
            Daftar akun baru
          </Link>
        </div>
      </div>
    </main>
  );
}
