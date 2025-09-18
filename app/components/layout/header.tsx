// app/components/layout/header.tsx
"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false); // desktop only
  const profileRef = useRef<HTMLDivElement>(null);

  // Tutup dropdown profile jika klik di luar + ESC untuk close semuanya
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // Kunci scroll body saat drawer terbuka, dan auto-close jika naik ke md
  useEffect(() => {
    if (menuOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";

    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setMenuOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => {
      document.body.style.overflow = "";
      mq.removeEventListener("change", onChange);
    };
  }, [menuOpen]);

  // Struktur menu yang sama seperti di sidebar/navbar
  const groups = [
    {
      title: "Pesanan",
      items: [
        { href: "/order", label: "Pesanan Saya" },
        { href: "/pembatalan", label: "Pembatalan Pesanan" },
      ],
    },
    {
      title: "Produk",
      items: [{ href: "/product", label: "Produk Saya" }],
    },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white backdrop-blur">
      <div className="relative flex h-16 items-center">
        {/* Logo + brand */}
        <Link href="/" className="group flex items-center rounded-xl px-4 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">
          <Image src={"/talance-logo.png"} alt="Talance Logo" width={30} height={30} />
        </Link>
        <div>
          <span className="font-medium">Talance Seller</span>
        </div>

        {/* Right controls */}
        <div className="ml-auto flex items-center gap-2">
          {/* === MOBILE ICONS (di kiri toggle) === */}
          <Link
            href="/notifications"
            aria-label="Notifikasi"
            className="inline-flex md:hidden h-10 w-10 items-center justify-center rounded-xl text-black hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            title="Notifikasi"
            onClick={() => setMenuOpen(false)}
          >
            <svg width={22} height={22} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M29.78,24.37l-3.65-4.48L26,12C24.85,5.58,21.21,2,16,2,10.5,2,6.08,6,5,11.82L4.87,20,2.14,24.48A1,1,0,0,0,3,26h9a4,4,0,0,0,8,0h9a1,1,0,0,0,.9-.57A1,1,0,0,0,29.78,24.37ZM16,28a2,2,0,0,1-2-2h4A2,2,0,0,1,16,28Z" />
            </svg>
          </Link>

          <Link
            href="/inbox"
            aria-label="Inbox"
            className="inline-flex md:hidden h-10 w-10 items-center justify-center rounded-xl text-black hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            title="Inbox"
            onClick={() => setMenuOpen(false)}
          >
            <svg width="22" height="24" viewBox="0 0 36 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M33 24H3C1.35 24 0 22.65 0 21V3C0 1.35 1.35 0 3 0H33C34.65 0 36 1.35 36 3V21C36 22.65 34.65 24 33 24Z" stroke="currentColor" />
              <path d="M18 15.9L4.84 7.38L18 14.11L31.16 6.12" stroke="currentColor" />
            </svg>
          </Link>

          {/* Mobile menu toggle (paling kanan) */}
          <button
            aria-label="Toggle menu"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-black hover:bg-slate-100 md:hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            onClick={() => setMenuOpen(true)}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* === DESKTOP ICONS === */}
          <Link
            href="/notifications"
            aria-label="Notifikasi"
            className="hidden md:inline-flex h-10 w-10 items-center justify-center rounded-xl text-black hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            title="Notifikasi"
          >
            <svg width={22} height={22} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M29.78,24.37l-3.65-4.48L26,12C24.85,5.58,21.21,2,16,2,10.5,2,6.08,6,5,11.82L4.87,20,2.14,24.48A1,1,0,0,0,3,26h9a4,4,0,0,0,8,0h9a1,1,0,0,0,.9-.57A1,1,0,0,0,29.78,24.37Z" />
            </svg>
          </Link>

          <Link
            href="/inbox"
            aria-label="Inbox"
            className="hidden md:inline-flex h-10 w-10 items-center justify-center rounded-xl text-black hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            title="Inbox"
          >
            <svg width="22" height="24" viewBox="0 0 36 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M33 24H3C1.35 24 0 22.65 0 21V3C0 1.35 1.35 0 3 0H33C34.65 0 36 1.35 36 3V21C36 22.65 34.65 24 33 24Z" stroke="currentColor" />
              <path d="M18 15.9L4.84 7.38L18 14.11L31.16 6.12" stroke="currentColor" />
            </svg>
          </Link>

          {/* Desktop-only Profile dropdown */}
          <div className="relative hidden md:block" ref={profileRef}>
            <button
              onClick={() => setProfileOpen((v) => !v)}
              className="group inline-flex items-center gap-2 rounded-xl bg-white px-2 py-1.5 text-black hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              aria-haspopup="menu"
              aria-expanded={profileOpen}
            >
              <span className="inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
                <span className="text-sm font-medium text-black">GM</span>
              </span>
              <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 text-slate-500 group-hover:text-slate-700 transition" fill="currentColor">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.127l3.71-3.896a.75.75 0 011.08 1.04l-4.24 4.46a.75.75 0 01-1.08 0l-4.24-4.46a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </button>

            {profileOpen && (
              <div role="menu" className="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl">
                <Link href="/profile" role="menuitem" className="block rounded-lg px-3 py-2 text-sm text-slate-800 hover:bg-slate-50" onClick={() => setProfileOpen(false)}>
                  Profile
                </Link>
                <Link href="/settings" role="menuitem" className="block rounded-lg px-3 py-2 text-sm text-slate-800 hover:bg-slate-50" onClick={() => setProfileOpen(false)}>
                  Settings
                </Link>
                <div className="my-1 h-px bg-slate-200" />
                <button
                  role="menuitem"
                  className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                  onClick={() => {
                    setProfileOpen(false);
                    // TODO: logout
                  }}
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========== MOBILE SLIDE-OVER ========== */}
      {/* Overlay menutupi layar */}
      <div
        className={`fixed inset-0 z-[60] bg-black/50 transition-opacity duration-300 md:hidden ${menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden={!menuOpen}
      />
      {/* Panel dari kanan */}
      <aside
        className={`fixed right-0 top-0 z-[61] h-screen w-[100%] max-w-[560px] bg-white shadow-2xl md:hidden transition-transform duration-300 ${menuOpen ? "translate-x-0" : "translate-x-full"}`}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile menu"
      >
        <div className="flex items-center justify-between px-4 h-16 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Image src="/talance-logo.png" alt="Logo" width={28} height={28} />
            <span className="font-medium">Menu</span>
          </div>
          <button onClick={() => setMenuOpen(false)} aria-label="Close menu" className="inline-flex h-10 w-10 items-center justify-center rounded-xl hover:bg-slate-100">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto h-[calc(100vh-64px)]">
          {/* Profile quick section */}
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
                <span className="text-sm font-medium text-black">GM</span>
              </span>
              <div>
                <p className="text-sm font-medium text-slate-900">Seller Akun</p>
                <p className="text-xs text-slate-500">Akun</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link href="/profile" className="rounded-lg px-3 py-2 text-sm text-slate-800 hover:bg-slate-100 border text-center" onClick={() => setMenuOpen(false)}>
                Profile
              </Link>
              <Link href="/settings" className="rounded-lg px-3 py-2 text-sm text-slate-800 hover:bg-slate-100 border text-center" onClick={() => setMenuOpen(false)}>
                Settings
              </Link>
            </div>
          </div>

          {/* Quick actions */}
          <nav className="p-4 border-b border-slate-200">
            <ul className="space-y-2">
              <li>
                <Link href="/notifications" className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-100 text-slate-900" onClick={() => setMenuOpen(false)}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4C18.2 14.2 18 13.3 18 12V9a6 6 0 10-12 0v3c0 1.3-.2 2.2-.6 2.6L4 17h5m6 0v1a3 3 0 11-6 0v-1" />
                  </svg>
                  <span>Notifikasi</span>
                </Link>
              </li>
              <li>
                <Link href="/inbox" className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-100 text-slate-900" onClick={() => setMenuOpen(false)}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h18M3 19h18M5 5l7 7 7-7" />
                  </svg>
                  <span>Inbox</span>
                </Link>
              </li>
            </ul>
          </nav>

          {/* Groups (Pesanan & Produk) */}
          <div className="p-4">
            {groups.map((group) => (
              <div key={group.title} className="mb-4">
                <div className="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{group.title}</div>
                <ul className="space-y-1">
                  {group.items.map((item) => (
                    <li key={item.href}>
                      <Link href={item.href} className="block rounded-lg px-3 py-2 hover:bg-slate-100 text-slate-900" onClick={() => setMenuOpen(false)}>
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="w-full p-2">
            <button
              className="w-full col-span-2 rounded-lg px-3 py-2 text-sm text-white bg-red-500 hover:bg-red-600"
              onClick={() => {
                // TODO: logout
                setMenuOpen(false);
              }}
            >
              Log out
            </button>
          </div>
        </div>
      </aside>
    </header>
  );
}
