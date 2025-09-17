// app/components/addons/ClientShell.tsx
"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import { firebaseAuth } from "@/libs/firebase/config";
import dynamic from "next/dynamic";

// ⬇️ Render Header & Navbar hanya di client (tidak di-SSR)
const Header = dynamic(() => import("../layout/header"), { ssr: false });
const Navbar = dynamic(() => import("../layout/navbar"), { ssr: false });

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const router = useRouter();

  // Halaman tanpa header + sidebar (auth pages)
  const HIDE_CHROME_ROUTES = ["/account/sign-in", "/account/sign-up", "/account/forget-password", "/account/reset-password", "/account/verify-email"];

  // Halaman yang wajib login
  const PROTECTED_EXACT = ["/"]; // persis "/"
  const PROTECTED_PREFIX = ["/home", "/dashboard", "/order", "/product"];

  const hideChrome = HIDE_CHROME_ROUTES.some((p) => pathname === p || pathname.startsWith(p + "/"));

  const requiresAuth = PROTECTED_EXACT.includes(pathname) || PROTECTED_PREFIX.some((p) => pathname === p || pathname.startsWith(p + "/"));

  // ——— Hydration guard ———
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [, setSidebarOpen] = useState(true);

  // Auth subscribe hanya setelah mounted
  useEffect(() => {
    if (!hydrated) return;
    const unsub = onAuthStateChanged(firebaseAuth, async (u) => {
      setUser(u);
      setChecking(false);

      if (!u && requiresAuth) {
        router.replace("/account/sign-in");
        return;
      }

      // Jika butuh verified dan user punya email tapi belum verified → kirim OTP & redirect
      if (requiresAuth && u?.email && !u.emailVerified) {
        try {
          const idToken = await u.getIdToken();
          await fetch("/api/auth/start-email-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken }),
          });
        } catch {}
        router.replace("/account/verify-email");
      }
    });
    return () => unsub();
  }, [hydrated, requiresAuth, router]);

  // Konten utama:
  // - Saat SSR & render pertama client (hydrated=false): placeholder statis (hindari mismatch)
  // - Setelah mounted: jika halaman proteksi dan belum siap → loader; else children
  let content: React.ReactNode = children;
  if (!hydrated) {
    content = <div className="grid min-h-[calc(100vh-64px)] place-items-center text-sm text-gray-500">{/* placeholder statis agar SSR == render pertama */}</div>;
  } else if (requiresAuth && (checking || !user)) {
    content = <div className="grid min-h-[calc(100vh-64px)] place-items-center text-sm text-gray-500">Memeriksa sesi…</div>;
  }

  return (
    <>
      {/* Chrome (Header & Navbar) hanya dirender setelah mounted */}
      {hydrated && !hideChrome && <Header />}
      {hydrated && !hideChrome && <Navbar onToggle={setSidebarOpen} />}

      <main suppressHydrationWarning className="transition-[margin] duration-100 p-4 sm:p-6 lg:px-8 lg:py-2" style={{ marginLeft: !hydrated || hideChrome ? 0 : "var(--sb-w, 0px)" }}>
        {content}
      </main>
    </>
  );
}
