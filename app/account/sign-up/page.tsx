// app/account/sign-up/page.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  GoogleAuthProvider,
  RecaptchaVerifier,
  signInWithPopup,
  signInWithPhoneNumber,
  ConfirmationResult,
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { firebaseAuth as auth, db } from "@/libs/firebase/config";
import PasswordField from "@/app/components/ui/PasswordField";
import { useRouter } from "next/navigation";

type Tab = "email" | "phone";

export default function SignUpPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("email");

  // Email form
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailMsg, setEmailMsg] = useState<string | null>(null);
  const [emailErr, setEmailErr] = useState<string | null>(null);
  const [emailAttempted, setEmailAttempted] = useState(false);

  // Phone form (OTP)
  const [phone, setPhone] = useState("+62");
  const [otp, setOtp] = useState("");
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [otpStep, setOtpStep] = useState<ConfirmationResult | null>(null);
  const [phoneMsg, setPhoneMsg] = useState<string | null>(null);
  const [phoneErr, setPhoneErr] = useState<string | null>(null);

  // Google
  const [googleLoading, setGoogleLoading] = useState(false);

  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

  // Init Invisible reCAPTCHA (Phone Auth)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!auth) return;
    if (!recaptchaRef.current) {
      recaptchaRef.current = new RecaptchaVerifier(
        auth,
        "recaptcha-container",
        {
          size: "invisible",
        }
      );
    }
  }, []);

  const ensureUserDoc = async (
    uid: string,
    extra: Record<string, unknown> = {}
  ) => {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    const base = {
      uid,
      displayName: displayName || null,
      email: email || null,
      phoneNumber: phone || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...extra,
    };
    if (snap.exists()) {
      await setDoc(
        ref,
        { updatedAt: serverTimestamp(), ...extra },
        { merge: true }
      );
    } else {
      await setDoc(ref, base, { merge: true });
    }
  };

  // ======== VALIDASI EMAIL FORM ========
  const displayNameMissing = emailAttempted && displayName.trim().length === 0;
  const passwordTooShort =
    password.trim().length > 0 && password.trim().length < 6;
  const passwordMismatch =
    password2.trim().length > 0 && password.trim() !== password2.trim();
  const emailFormValid =
    !!displayName.trim() &&
    !!email.trim() &&
    password.trim().length >= 6 &&
    password.trim() === password2.trim();

  // =========================
  // Email + Password Sign Up (OTP email)
  // =========================
  const onEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailAttempted(true);
    setEmailErr(null);
    setEmailMsg(null);

    const name = displayName.trim();
    const eml = email.trim();
    const p1 = password.trim();
    const p2 = password2.trim();

    if (!name) return setEmailErr("Nama tampilan wajib diisi.");
    if (!eml) return setEmailErr("Email wajib diisi.");
    if (p1.length < 6) return setEmailErr("Password minimal 6 karakter.");
    if (p1 !== p2) return setEmailErr("Password dan konfirmasi tidak cocok.");

    setEmailLoading(true);
    try {
      // 1) Buat akun
      const cred = await createUserWithEmailAndPassword(auth, eml, p1);
      await updateProfile(cred.user, { displayName: name });

      // 2) Simpan user doc
      await ensureUserDoc(cred.user.uid, {
        provider: "password",
        emailVerified: cred.user.emailVerified ?? false,
        displayName: name,
      });

      // 3) Mulai alur OTP email
      try {
        const u = auth.currentUser;
        if (u) {
          const idToken = await u.getIdToken();
          const res = await fetch("/api/auth/start-email-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken }),
          });
          if (!res.ok) throw new Error("start-email-otp failed");
        }
      } catch (err) {
        console.error("[sign-up] start-email-otp failed");
        setEmailMsg(
          "Akun dibuat, tetapi gagal mengirim kode verifikasi. Coba kirim ulang di halaman verifikasi."
        );
      }

      // 4) Alihkan ke halaman verifikasi OTP email (bukan freelance-form)
      router.replace("/account/verify-email");
    } catch (err: any) {
      const code = err?.code as string | undefined;
      if (code === "auth/email-already-in-use") {
        setEmailErr(
          "Email sudah terdaftar. Silakan masuk atau gunakan email lain."
        );
      } else if (code === "auth/invalid-email") {
        setEmailErr("Format email tidak valid.");
      } else if (code === "auth/weak-password") {
        setEmailErr("Password terlalu lemah. Gunakan minimal 6 karakter.");
      } else {
        setEmailErr("Gagal membuat akun. Coba lagi nanti.");
      }
    } finally {
      setEmailLoading(false);
    }
  };

  // =========================
  // Phone (OTP) Sign Up
  // =========================
  const onSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneErr(null);
    setPhoneMsg(null);
    setPhoneLoading(true);
    try {
      if (!recaptchaRef.current) throw new Error("reCAPTCHA belum siap.");
      const confirmation = await signInWithPhoneNumber(
        auth,
        phone.trim(),
        recaptchaRef.current
      );
      setOtpStep(confirmation);
      setPhoneMsg(
        "Kode OTP telah dikirim via SMS. Masukkan 6 digit kode di bawah."
      );
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
      const cred = await otpStep.confirm(otp.trim());
      await ensureUserDoc(cred.user.uid, {
        provider: "phone",
        phoneVerified: true,
      });

      // ➜ BUKAN ke freelance-form; arahkan ke beranda agar tidak memicu guard form
      router.replace("/");
      setPhoneMsg("Nomor berhasil diverifikasi dan akun dibuat / login.");
      setOtpStep(null);
      setOtp("");
    } catch (err: any) {
      setPhoneErr(err?.message ?? "OTP salah atau kedaluwarsa.");
    } finally {
      setPhoneLoading(false);
    }
  };

  // =========================
  // Google Sign In
  // =========================
  const onGoogle = async () => {
    setGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      await ensureUserDoc(cred.user.uid, {
        provider: "google",
        email: cred.user.email ?? null,
        displayName: cred.user.displayName ?? null,
      });

      // ➜ BUKAN ke freelance-form; arahkan ke beranda
      router.replace("/");
    } catch {
      // optional: toast
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-64px)] bg-white">
      {/* Container reCAPTCHA (invisible) */}
      <div id="recaptcha-container" />

      <div className="mx-auto max-w-md px-4 py-8">
        <h1 className="text-2xl font-semibold text-gray-900">Buat Akun</h1>
        <p className="mt-1 text-sm text-gray-500">
          Pilih metode pendaftaran di bawah ini.
        </p>

        {/* Tabs */}
        <div className="mt-6 grid grid-cols-2 rounded-xl border border-gray-200 p-1 text-center text-sm">
          <button
            className={`rounded-lg py-2 transition ${
              tab === "email"
                ? "bg-gray-900 text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
            onClick={() => setTab("email")}
          >
            Email
          </button>
          <button
            className={`rounded-lg py-2 transition ${
              tab === "phone"
                ? "bg-gray-900 text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
            onClick={() => setTab("phone")}
          >
            Nomor HP
          </button>
        </div>

        {/* Email form */}
        {tab === "email" && (
          <form onSubmit={onEmailSignUp} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Nama
              </label>
              <input
                required
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Nama tampilan"
                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-gray-900 outline-none focus:border-gray-900"
              />
              {displayNameMissing && (
                <p className="mt-1 text-xs text-red-600">
                  Nama tampilan wajib diisi.
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email
              </label>
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
                id="signup-password"
                name="password"
                placeholder="minimal 6 karakter"
                autoComplete="new-password"
              />
              {passwordTooShort && (
                <p className="mt-1 text-xs text-red-600">
                  Password minimal 6 karakter.
                </p>
              )}
            </div>
            <div>
              <PasswordField
                label="Konfirmasi Password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                id="signup-password2"
                name="password_confirmation"
                placeholder="ulangi password"
                autoComplete="new-password"
              />
              {passwordMismatch && (
                <p className="mt-1 text-xs text-red-600">
                  Password dan konfirmasi tidak cocok.
                </p>
              )}
            </div>

            {emailErr && <p className="text-sm text-red-600">{emailErr}</p>}
            {emailMsg && <p className="text-sm text-emerald-700">{emailMsg}</p>}

            <button
              disabled={emailLoading || !emailFormValid}
              type="submit"
              className="w-full rounded-xl bg-gray-900 px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-60"
              title={!emailFormValid ? "Lengkapi form dengan benar" : undefined}
            >
              {emailLoading ? "Memproses..." : "Daftar via Email"}
            </button>
          </form>
        )}

        {/* Phone form */}
        {tab === "phone" && (
          <div className="mt-6 space-y-4">
            {!otpStep ? (
              <form onSubmit={onSendOtp} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Nomor HP
                  </label>
                  <input
                    required
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+62xxxxxxxxxx"
                    className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-gray-900 outline-none focus:border-gray-900"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Gunakan format internasional (contoh: +62812xxxxxx).
                  </p>
                </div>

                {phoneErr && <p className="text-sm text-red-600">{phoneErr}</p>}
                {phoneMsg && (
                  <p className="text-sm text-emerald-700">{phoneMsg}</p>
                )}

                <button
                  disabled={phoneLoading}
                  type="submit"
                  className="w-full rounded-xl bg-gray-900 px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-60"
                >
                  {phoneLoading ? "Mengirim OTP..." : "Kirim OTP"}
                </button>
              </form>
            ) : (
              <form onSubmit={onVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Kode OTP
                  </label>
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
                {phoneMsg && (
                  <p className="text-sm text-emerald-700">{phoneMsg}</p>
                )}

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
                  <button
                    disabled={phoneLoading}
                    type="submit"
                    className="w-2/3 rounded-xl bg-gray-900 px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-60"
                  >
                    {phoneLoading ? "Memverifikasi..." : "Verifikasi & Daftar"}
                  </button>
                </div>
              </form>
            )}

            <div className="rounded-lg bg-amber-50 p-3 text-amber-800 text-xs">
              <b>Catatan:</b> Firebase Phone Auth tidak memakai password. Jika
              ingin “HP + password”, perlu backend custom. Flow di atas aman:
              verifikasi OTP.
            </div>
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
            <path
              fill="#4CAF50"
              d="M24,44c4.671,0,8.962-1.793,12.207-4.717l-5.628-4.766C28.552,35.523,26.393,36,24,36 c-5.202,0-9.62-3.317-11.276-7.953l-6.5,5.016C9.568,39.556,16.227,44,24,44z"
            />
            <path
              fill="#1976D2"
              d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.075,5.564 c0.001-0.001,0.001-0.001,0.002-0.002l5.628,4.766C35.739,39.043,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
            />
          </svg>
          {googleLoading ? "Menghubungkan..." : "Lanjut dengan Google"}
        </button>

        {/* Footer helper */}
        <p className="mt-6 text-center text-sm text-gray-600">
          Sudah punya akun?{" "}
          <Link
            href="/account/sign-in"
            className="font-medium text-gray-900 underline-offset-4 hover:underline"
          >
            Masuk di sini
          </Link>
        </p>
      </div>
    </main>
  );
}
