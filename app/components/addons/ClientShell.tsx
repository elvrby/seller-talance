// app/components/ClientShell.tsx
"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import { firebaseAuth } from "@/libs/firebase/config";
import Header from "../layout/header";
import Navbar from "../layout/navbar";

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const router = useRouter();

  // Halaman tanpa header + sidebar (auth pages)
  const HIDE_CHROME_ROUTES = ["/account/sign-in", "/account/sign-up", "/account/forget-password", "/account/reset-password"];

  // Halaman yang wajib login (sesuaikan list ini)
  const PROTECTED_EXACT = ["/"]; // persis "/"
  const PROTECTED_PREFIX = ["/home", "/dashboard", "/order", "/product"];

  const hideChrome = HIDE_CHROME_ROUTES.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const requiresAuth = PROTECTED_EXACT.includes(pathname) || PROTECTED_PREFIX.some((p) => pathname === p || pathname.startsWith(p + "/"));

  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [, setSidebarOpen] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(firebaseAuth, (u) => {
      setUser(u);
      setChecking(false);
      if (!u && requiresAuth) router.replace("/account/sign-in");
    });
    return () => unsub();
  }, [router, requiresAuth]);

  // Konten utama: kalau halaman diproteksi dan belum siap, tampilkan loader — header/sidebar tetap dirender
  const content = requiresAuth && (checking || !user) ? <div className="grid min-h-[calc(100vh-64px)] place-items-center text-sm text-gray-500">Memeriksa sesi…</div> : children;

  return (
    <>
      {!hideChrome && <Header />}
      {!hideChrome && <Navbar onToggle={setSidebarOpen} />}

      <main className="transition-[margin] duration-100 p-4 sm:p-6 lg:px-8 lg:py-2" style={{ marginLeft: hideChrome ? 0 : "var(--sb-w, 0px)" }}>
        {content}
      </main>
    </>
  );
}
