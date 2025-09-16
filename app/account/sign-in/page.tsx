// app/account/sign-in/page.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { GoogleAuthProvider, RecaptchaVerifier, signInWithPopup, signInWithPhoneNumber, ConfirmationResult, signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import type { FirebaseError } from "firebase/app";
import { firebaseAuth as auth, db } from "@/libs/firebase/config";
import PasswordField from "@/app/components/ui/PasswordField";

type Tab = "email" | "phone";

export default function SignInPage() {
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("email");

  // Email form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailMsg, setEmailMsg] = useState<string | null>(null);
  const [emailErr, setEmailErr] = useState<string | null>(null);

  // Forgot password
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  // Phone form
  const [phone, setPhone] = useState("+62");
  const [otp, setOtp] = useState("");
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [otpStep, setOtpStep] = useState<ConfirmationResult | null>(null);
  const [phoneMsg, setPhoneMsg] = useState<string | null>(null);
  const [phoneErr, setPhoneErr] = useState<string | null>(null);

  // Google
  const [googleLoading, setGoogleLoading] = useState(false);

  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

  // Init Invisible reCAPTCHA untuk Phone Auth (sekali)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!auth) return;
    if (!recaptchaRef.current) {
      recaptchaRef.current = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
      });
    }
  }, []);

  // Buat/merge dokumen user di Firestore
  const ensureUserDoc = async (uid: string, extra: Record<string, unknown> = {}) => {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    const base = {
      uid,
      updatedAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
      ...extra,
    };
    if (snap.exists()) {
      await setDoc(ref, base, { merge: true });
    } else {
      await setDoc(
        ref,
        {
          ...base,
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );
    }
  };

  // ============== Helper: Mapping error jadi pesan ramah (tanpa enumeration) ==============
  function mapEmailSignInError(err: unknown): string {
    const code = (err as FirebaseError)?.code ?? "unknown";
    switch (code) {
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
        return "Email atau password salah. Coba lagi.";
      case "auth/invalid-email":
        return "Format email tidak valid.";
      case "auth/too-many-requests":
        return "Terlalu banyak percobaan masuk. Coba lagi beberapa saat.";
      case "auth/user-disabled":
        return "Akun Anda dinonaktifkan. Hubungi dukungan jika ini kesalahan.";
      default:
        return "Gagal masuk. Coba lagi atau gunakan metode lain.";
    }
  }

  function mapPhoneError(err: unknown): string {
    const code = (err as FirebaseError)?.code ?? "unknown";
    switch (code) {
      case "auth/invalid-verification-code":
        return "Kode OTP salah. Coba masukkan ulang.";
      case "auth/code-expired":
        return "Kode OTP kedaluwarsa. Kirim ulang kode.";
      case "auth/too-many-requests":
        return "Terlalu banyak percobaan. Coba lagi beberapa saat.";
      case "auth/invalid-phone-number":
        return "Nomor HP tidak valid. Gunakan format internasional (mis. +62812xxxx).";
      default:
        return "Gagal memproses OTP. Coba lagi.";
    }
  }

  function mapGoogleError(err: unknown): string | null {
    const code = (err as FirebaseError)?.code ?? "unknown";
    switch (code) {
      case "auth/popup-closed-by-user":
      case "auth/cancelled-popup-request":
        return null; // user menutup popup, tak perlu notifikasi
      case "auth/popup-blocked":
        return "Popup diblokir oleh browser. Izinkan popup untuk melanjutkan.";
      case "auth/unauthorized-domain":
        return "Domain belum diizinkan di Firebase Auth. Hubungi admin.";
      default:
        return "Gagal masuk dengan Google. Coba lagi.";
    }
  }

  // =========================
  // Email + Password Sign In
  // =========================
  const onEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailErr(null);
    setEmailMsg(null);
    setResetMsg(null);
    setEmailLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      await ensureUserDoc(cred.user.uid, {
        provider: "password",
        email: cred.user.email ?? null,
        emailVerified: cred.user.emailVerified ?? false,
        displayName: cred.user.displayName ?? null,
      });
      if (!cred.user.emailVerified) {
        setEmailMsg("Login berhasil, tetapi email Anda belum terverifikasi. Cek inbox untuk verifikasi.");
      }
      router.replace("/");
    } catch (err) {
      const msg = mapEmailSignInError(err);
      setEmailErr(msg);
    } finally {
      setEmailLoading(false);
    }
  };

  // =========================
  // Forgot password (pesan netral)
  // =========================
  const onForgotPassword = async () => {
    setResetMsg(null);
    try {
      if (!email.trim()) {
        setResetMsg("Masukkan email Anda terlebih dahulu.");
        return;
      }
      await sendPasswordResetEmail(auth, email.trim());
      setResetMsg("Jika email terdaftar, kami telah mengirim tautan reset password.");
    } catch {
      // tetap netral, jangan bocorkan ada/tidaknya akun
      setResetMsg("Jika email terdaftar, kami telah mengirim tautan reset password.");
    }
  };

  // =========================
  // Phone (OTP) Sign In
  // =========================
  const onSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneErr(null);
    setPhoneMsg(null);
    setPhoneLoading(true);
    try {
      if (!recaptchaRef.current) throw new Error("reCAPTCHA belum siap.");
      const confirmation = await signInWithPhoneNumber(auth, phone.trim(), recaptchaRef.current);
      setOtpStep(confirmation);
      setPhoneMsg("Kode OTP telah dikirim via SMS. Masukkan 6 digit kode di bawah.");
    } catch (err) {
      setPhoneErr(mapPhoneError(err));
    } finally {
      setPhoneLoading(false);
    }
  };

  const onVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneErr(null);
    setPhoneMsg(null);
    setPhoneLoading(true);
    try {
      if (!otpStep) throw new Error("Konfirmasi OTP belum dimulai.");
      const cred = await otpStep.confirm(otp.trim());
      await ensureUserDoc(cred.user.uid, {
        provider: "phone",
        phoneNumber: cred.user.phoneNumber ?? phone,
        phoneVerified: true,
        displayName: cred.user.displayName ?? null,
      });
      router.replace("/");
    } catch (err) {
      setPhoneErr(mapPhoneError(err));
    } finally {
      setPhoneLoading(false);
    }
  };

  // =========================
  // Google Sign In
  // =========================
  const onGoogle = async () => {
    setGoogleLoading(true);
    setEmailErr(null);
    setEmailMsg(null);
    setResetMsg(null);
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      await ensureUserDoc(cred.user.uid, {
        provider: "google",
        email: cred.user.email ?? null,
        displayName: cred.user.displayName ?? null,
      });
      router.replace("/");
    } catch (err) {
      const msg = mapGoogleError(err);
      if (msg) setEmailErr(msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-64px)] bg-white">
      {/* Container reCAPTCHA (invisible) */}
      <div id="recaptcha-container" />

      <div className="mx-auto max-w-md px-4 py-8">
        <h1 className="text-2xl font-semibold text-gray-900">Masuk</h1>
        <p className="mt-1 text-sm text-gray-500">Pilih metode login di bawah ini.</p>

        {/* Tabs */}
        <div className="mt-6 grid grid-cols-2 rounded-xl border border-gray-200 p-1 text-center text-sm">
          <button className={`rounded-lg py-2 transition ${tab === "email" ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100"}`} onClick={() => setTab("email")}>
            Email
          </button>
          <button className={`rounded-lg py-2 transition ${tab === "phone" ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100"}`} onClick={() => setTab("phone")}>
            Nomor HP
          </button>
        </div>

        {/* Email form */}
        {tab === "email" && (
          <form onSubmit={onEmailSignIn} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@domain.com"
                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-gray-900 outline-none focus:border-gray-900"
              />
            </div>
            <div>
              <PasswordField
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                id="signin-password"
                name="password"
                placeholder="kata sandi"
                autoComplete="current-password"
              />
            </div>

            {/* Alerts */}
            {emailErr && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{emailErr}</div>}
            {emailMsg && <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{emailMsg}</div>}
            {resetMsg && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{resetMsg}</div>}

            <div className="block w-full items-center justify-between">
              <button disabled={emailLoading} type="submit" className="rounded-xl bg-gray-900 px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-60 w-full">
                {emailLoading ? "Memproses..." : "Masuk via Email"}
              </button>
              <Link href={"forget-password"} className="text-xs text-gray-700 underline underline-offset-4 hover:text-gray-900 ml-2">
                Lupa password?
              </Link>
            </div>
          </form>
        )}

        {/* Phone form */}
        {tab === "phone" && (
          <div className="mt-6 space-y-4">
            {!otpStep ? (
              <form onSubmit={onSendOtp} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nomor HP</label>
                  <input
                    required
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+62xxxxxxxxxx"
                    className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-gray-900 outline-none focus:border-gray-900"
                  />
                  <p className="mt-1 text-xs text-gray-500">Gunakan format internasional (contoh: +62812xxxxxx).</p>
                </div>

                {phoneErr && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{phoneErr}</div>}
                {phoneMsg && <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">{phoneMsg}</div>}

                <button disabled={phoneLoading} type="submit" className="w-full rounded-xl bg-gray-900 px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-60">
                  {phoneLoading ? "Mengirim OTP..." : "Kirim OTP"}
                </button>
              </form>
            ) : (
              <form onSubmit={onVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Kode OTP</label>
                  <input
                    required
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="6 digit"
                    className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-gray-900 outline-none focus:border-gray-900 tracking-widest"
                  />
                </div>

                {phoneErr && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{phoneErr}</div>}
                {phoneMsg && <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">{phoneMsg}</div>}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setOtpStep(null);
                      setOtp("");
                      setPhoneMsg(null);
                      setPhoneErr(null);
                    }}
                    className="w-1/3 rounded-xl border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-100"
                  >
                    Ganti Nomor
                  </button>
                  <button disabled={phoneLoading} type="submit" className="w-2/3 rounded-xl bg-gray-900 px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-60">
                    {phoneLoading ? "Memverifikasi..." : "Verifikasi & Masuk"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Divider */}
        <div className="my-8 flex items-center gap-3 text-xs text-gray-500">
          <div className="h-px flex-1 bg-gray-200" />
          <span>atau</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        {/* Google Sign-in */}
        <button
          onClick={onGoogle}
          disabled={googleLoading}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white px-4 py-2 text-gray-800 hover:bg-gray-50 disabled:opacity-60"
        >
          <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
            <path
              fill="#FFC107"
              d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12 s5.373-12,12-12c3.059,0,5.842,1.153,7.961,3.039l5.657-5.657C33.046,6.053,28.727,4,24,4C12.955,4,4,12.955,4,24 s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
            />
            <path
              fill="#FF3D00"
              d="M6.306,14.691l6.571,4.819C14.655,16.052,19.004,13,24,13c3.059,0,5.842,1.153,7.961,3.039 l5.657-5.657C33.046,6.053,28.727,4,24,4C16.318,4,9.692,8.337,6.306,14.691z"
            />
            <path fill="#4CAF50" d="M24,44c4.671,0,8.962-1.793,12.207-4.717l-5.628-4.766C28.552,35.523,26.393,36,24,36 c-5.202,0-9.62-3.317-11.276-7.953l-6.5,5.016C9.568,39.556,16.227,44,24,44z" />
            <path
              fill="#1976D2"
              d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.075,5.564 c0.001-0.001,0.001-0.001,0.002-0.002l5.628,4.766C35.739,39.043,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
            />
          </svg>
          {googleLoading ? "Menghubungkan..." : "Lanjut dengan Google"}
        </button>

        {/* Footer helper */}
        <p className="mt-6 text-center text-sm text-gray-600">
          Belum punya akun?{" "}
          <Link href="/account/sign-up" className="font-medium text-gray-900 underline-offset-4 hover:underline">
            Daftar di sini
          </Link>
        </p>
      </div>
    </main>
  );
}
