// app/components/addons/ClientShell.tsx
"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import { firebaseAuth } from "@/libs/firebase/config";
import { db } from "@/libs/firebase/config";
import { doc, getDoc } from "firebase/firestore";
import dynamic from "next/dynamic";

// Render Header & Navbar hanya di client (hindari hydration mismatch)
const Header = dynamic(() => import("../layout/header"), { ssr: false });
const Navbar = dynamic(() => import("../layout/navbar"), { ssr: false });

export default function ClientShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() || "/";
  const router = useRouter();

  // Halaman tanpa header + sidebar (auth & onboarding)
  const HIDE_CHROME_ROUTES = [
    "/account/sign-in",
    "/account/sign-up",
    "/account/forget-password",
    "/account/reset-password",
    "/account/verify-email",
    "/account/freelance-form",
  ];

  // Halaman yang wajib login
  const PROTECTED_EXACT = ["/"]; // persis "/"
  const PROTECTED_PREFIX = ["/home", "/dashboard", "/order", "/product"];

  const hideChrome = HIDE_CHROME_ROUTES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  const requiresAuth =
    PROTECTED_EXACT.includes(pathname) ||
    PROTECTED_PREFIX.some(
      (p) => pathname === p || pathname.startsWith(p + "/")
    );

  // Hydration guard
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (!hydrated) return;

    const unsub = onAuthStateChanged(firebaseAuth, async (u) => {
      setUser(u);

      // 1) Belum login → ke sign-in jika halaman proteksi
      if (!u) {
        setChecking(false);
        if (requiresAuth) router.replace("/account/sign-in");
        return;
      }

      // Segarkan status auth (termasuk emailVerified)
      try {
        await u.reload();
      } catch {}
      try {
        await u.getIdToken(true);
      } catch {}

      // 2) Email belum terverifikasi → kirim OTP & paksa ke verify
      const isEmailUser = Boolean(u.email);
      const isVerified = isEmailUser ? u.emailVerified : true;

      if (isEmailUser && !isVerified && pathname !== "/account/verify-email") {
        try {
          const idToken = await u.getIdToken();
          await fetch("/api/auth/start-email-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken }),
          });
        } catch {}
        router.replace("/account/verify-email");
        setChecking(false);
        return;
      }

      // 3) Onboarding freelancer belum selesai
      //    ➜ HANYA cek/setelah verified, dan JANGAN ganggu saat user di halaman verify-email atau freelance-form.
      const isVerifyPage = pathname === "/account/verify-email";
      const isFreelanceFormPage = pathname === "/account/freelance-form";

      const canCheckOnboarding =
        // cek hanya jika:
        // - user sudah verified ATAU bukan user email
        (isVerified || !isEmailUser) &&
        // - bukan di halaman yang seharusnya tidak diganggu
        !isVerifyPage &&
        !isFreelanceFormPage;

      if (canCheckOnboarding) {
        try {
          const snap = await getDoc(doc(db, "users", u.uid));
          const data = snap.exists() ? snap.data() : null;
          const done = Boolean(
            (data as any)?.onboarding?.freelanceFormCompleted
          );
          if (!done) {
            router.replace("/account/freelance-form");
            setChecking(false);
            return;
          }
        } catch {
          // Jangan paksa redirect saat gagal baca; biarkan user tetap di halaman
        }
      }

      setChecking(false);
    });

    return () => unsub();
  }, [hydrated, requiresAuth, pathname, router]);

  // Loader di protected flow
  const content =
    !hydrated || checking ? (
      <div className="grid min-h-[calc(100vh-64px)] place-items-center text-sm text-gray-500">
        Memeriksa sesi…
      </div>
    ) : (
      children
    );

  return (
    <>
      {hydrated && !hideChrome && <Header />}
      {hydrated && !hideChrome && <Navbar onToggle={setSidebarOpen} />}

      <main
        suppressHydrationWarning
        className="transition-[margin] duration-100 p-4 sm:p-6 lg:px-8 lg:py-2"
        style={{ marginLeft: !hydrated || hideChrome ? 0 : "var(--sb-w, 0px)" }}
      >
        {content}
      </main>
    </>
  );
}
