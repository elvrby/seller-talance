"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";
import { firebaseAuth as auth } from "@/libs/firebase/config";
import PasswordField from "@/app/components/ui/PasswordField";

type Tab = "email" | "phone";

export default function SignInPage() {
  const [tab, setTab] = useState<Tab>("email");

  // email form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailErr, setEmailErr] = useState<string | null>(null);
  const [emailMsg, setEmailMsg] = useState<string | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);

  // phone form
  const [phone, setPhone] = useState("+62");
  const [otp, setOtp] = useState("");
  const [otpStep, setOtpStep] = useState<ConfirmationResult | null>(null);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneErr, setPhoneErr] = useState<string | null>(null);
  const [phoneMsg, setPhoneMsg] = useState<string | null>(null);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

  // google
  const [googleLoading, setGoogleLoading] = useState(false);

  // Jika user sudah login & belum verified → paksa ke halaman verify
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) return;
      try {
        await u.reload();
      } catch {}
      const me = auth.currentUser;
      if (me?.email && !me.emailVerified) {
        try {
          const idToken = await me.getIdToken();
          await fetch("/api/auth/start-email-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken }),
          });
        } catch {}
        window.location.href = "/account/verify-email";
      }
    });
    return () => unsub();
  }, []);

  // Init invisible reCAPTCHA untuk Phone
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!auth) return;
    if (!recaptchaRef.current) {
      recaptchaRef.current = new RecaptchaVerifier(auth, "recaptcha-container", { size: "invisible" });
    }
  }, []);

  const onEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailErr(null);
    setEmailMsg(null);
    setEmailLoading(true);

    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password.trim());

      // pastikan status terbaru
      await cred.user.reload();
      const me = auth.currentUser;

      if (me?.email && !me.emailVerified) {
        // kirim OTP baru + redirect ke verify
        try {
          const idToken = await me.getIdToken();
          await fetch("/api/auth/start-email-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken }),
          });
        } catch {}
        setEmailMsg("Akun ditemukan, tetapi email belum terverifikasi. Kode OTP baru telah dikirim.");
        window.location.href = "/account/verify-email";
        return;
      }

      // verified → ke home
      window.location.href = "/";
    } catch (err: any) {
      const code = err?.code as string | undefined;
      if (code === "auth/wrong-password") {
        setEmailErr("Password salah. Coba lagi.");
      } else if (code === "auth/user-not-found") {
        setEmailErr("Akun tidak ditemukan. Periksa email atau daftar akun baru.");
      } else if (code === "auth/too-many-requests") {
        setEmailErr("Terlalu banyak percobaan. Silakan coba beberapa saat lagi.");
      } else if (code === "auth/invalid-credential") {
        setEmailErr("Email atau password salah.");
      } else {
        setEmailErr("Gagal masuk. Coba lagi nanti.");
      }
    } finally {
      setEmailLoading(false);
    }
  };

  const onGoogle = async () => {
    setGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      await cred.user.reload();
      const me = auth.currentUser;

      // biasanya Google verified; kalau tidak, perlakukan sama
      if (me?.email && !me.emailVerified) {
        try {
          const idToken = await me.getIdToken();
          await fetch("/api/auth/start-email-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken }),
          });
        } catch {}
        window.location.href = "/account/verify-email";
        return;
      }
      window.location.href = "/";
    } catch {
      // abaikan
    } finally {
      setGoogleLoading(false);
    }
  };

  const onSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneErr(null);
    setPhoneMsg(null);
    setPhoneLoading(true);
    try {
      if (!recaptchaRef.current) throw new Error("reCAPTCHA belum siap.");
      const confirmation = await signInWithPhoneNumber(auth, phone.trim(), recaptchaRef.current);
      setOtpStep(confirmation);
      setPhoneMsg("Kode OTP SMS telah dikirim. Masukkan 6 digit kode.");
    } catch (err: any) {
      setPhoneErr(err?.message ?? "Gagal mengirim OTP.");
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
      await otpStep.confirm(otp.trim());
      window.location.href = "/";
    } catch (err: any) {
      setPhoneErr(err?.message ?? "OTP salah atau kedaluwarsa.");
    } finally {
      setPhoneLoading(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-64px)] bg-white">
      <div id="recaptcha-container" />
      <div className="mx-auto max-w-md px-4 py-8">
        <h1 className="text-2xl font-semibold text-gray-900">Masuk</h1>
        <p className="mt-1 text-sm text-gray-500">Gunakan email & password, Google, atau nomor HP.</p>

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
                placeholder="******"
                autoComplete="current-password"
              />
            </div>

            {emailErr && <p className="text-sm text-red-600">{emailErr}</p>}
            {emailMsg && <p className="text-sm text-emerald-700">{emailMsg}</p>}

            <button disabled={emailLoading} type="submit" className="w-full rounded-xl bg-gray-900 px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-60">
              {emailLoading ? "Memproses..." : "Masuk"}
            </button>

            <div className="text-right">
              <Link href="/account/forget-password" className="text-sm text-gray-700 underline underline-offset-4 hover:text-gray-900">
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
                </div>

                {phoneErr && <p className="text-sm text-red-600">{phoneErr}</p>}
                {phoneMsg && <p className="text-sm text-emerald-700">{phoneMsg}</p>}

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

                {phoneErr && <p className="text-sm text-red-600">{phoneErr}</p>}
                {phoneMsg && <p className="text-sm text-emerald-700">{phoneMsg}</p>}

                <button disabled={phoneLoading} type="submit" className="w-full rounded-xl bg-gray-900 px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-60">
                  {phoneLoading ? "Memverifikasi..." : "Masuk"}
                </button>
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

        <p className="mt-6 text-center text-sm text-gray-600">
          Belum punya akun?{" "}
          <Link href="/account/sign-up" className="font-medium text-gray-900 underline-offset-4 hover:underline">
            Daftar
          </Link>
        </p>
      </div>
    </main>
  );
}
