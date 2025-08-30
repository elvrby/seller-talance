"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false); // desktop only
  const profileRef = useRef<HTMLDivElement>(null);

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

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white backdrop-blur">
      <div className="relative  flex h-16 items-center">
        {/* Left: Logo */}
        <Link href="/" className="group flex items-center  rounded-xl px-2 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40">
          <span className="relative inline-flex h-8  items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
            <span className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/15 to-white/5" />
            <span className="block h-3 w-3 rotate-45 rounded-[4px] bg-white" />
          </span>
          <span className="text-lg font-semibold tracking-wide text-black">
            Seller <span className="text-black">Dashboard</span>
          </span>
        </Link>

        {/* Center: Nav (absolute center on md+) */}
        <nav className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 md:flex items-center gap-6">
          <Link href="/" className="text-sm text-black hover:text-green-800 transition-colors">
            Home
          </Link>
          <Link href="/about" className="text-sm text-black hover:text-green-800 transition-colors">
            About
          </Link>
          <Link href="/terms" className="text-sm text-black hover:text-green-800 transition-colors">
            Terms &amp; Use
          </Link>
        </nav>

        {/* Right: controls */}
        <div className="ml-auto flex items-center gap-2">
          {/* Mobile menu toggle */}
          <button
            aria-label="Toggle menu"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-black hover:bg-black md:hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              {menuOpen ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>

          {/* Desktop-only Profile dropdown */}
          <div className="relative hidden md:block" ref={profileRef}>
            <button
              onClick={() => setProfileOpen((v) => !v)}
              className="group inline-flex items-center gap-2 rounded-xl  bg-white/5 px-2 py-1.5 text-black hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              aria-haspopup="menu"
              aria-expanded={profileOpen}
            >
              <span className="inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-white/10 ring-1 ring-white/15">
                <span className="text-sm font-medium text-black">GM</span>
              </span>
              <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 text-white/70 group-hover:text-white transition" fill="currentColor">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.127l3.71-3.896a.75.75 0 011.08 1.04l-4.24 4.46a.75.75 0 01-1.08 0l-4.24-4.46a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </button>

            {profileOpen && (
              <div role="menu" className="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border border-white/10 bg-black/95 p-1.5 shadow-2xl ring-1 ring-white/10 backdrop-blur">
                <Link href="/profile" role="menuitem" className="block rounded-lg px-3 py-2 text-sm text-white/90 hover:bg-white/10" onClick={() => setProfileOpen(false)}>
                  Profile
                </Link>
                <Link href="/settings" role="menuitem" className="block rounded-lg px-3 py-2 text-sm text-white/90 hover:bg-white/10" onClick={() => setProfileOpen(false)}>
                  Settings
                </Link>
                <div className="my-1 h-px bg-white/10" />
                <button
                  role="menuitem"
                  className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-300 hover:bg-red-400/10"
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

      {/* Mobile nav sheet (menu + profile) */}
      {menuOpen && (
        <div className="md:hidden">
          <div className="border-t border-white/10" />
          <nav className="mx-auto px-4 sm:px-6 lg:px-8 py-3 space-y-1">
            {/* Main links */}
            <Link href="/" className="block rounded-lg px-3 py-2 text-white/90 hover:bg-white/10" onClick={() => setMenuOpen(false)}>
              Home
            </Link>
            <Link href="/about" className="block rounded-lg px-3 py-2 text-white/90 hover:bg-white/10" onClick={() => setMenuOpen(false)}>
              About
            </Link>
            <Link href="/terms" className="block rounded-lg px-3 py-2 text-white/90 hover:bg-white/10" onClick={() => setMenuOpen(false)}>
              Terms &amp; Use
            </Link>

            {/* Divider */}
            <div className="my-2 h-px bg-white/10" />

            {/* Profile area for mobile */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-white/10 ring-1 ring-white/15">
                  <span className="text-sm font-medium text-white/90">GM</span>
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">Seller Dashboard</p>
                  <p className="text-xs text-white/60">Akun</p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link href="/profile" className="rounded-lg px-3 py-2 text-sm text-white/90 hover:bg-white/10 text-center" onClick={() => setMenuOpen(false)}>
                  Profile
                </Link>
                <Link href="/settings" className="rounded-lg px-3 py-2 text-sm text-white/90 hover:bg-white/10 text-center" onClick={() => setMenuOpen(false)}>
                  Settings
                </Link>
                <button
                  className="col-span-2 rounded-lg px-3 py-2 text-sm text-red-300 hover:bg-red-400/10"
                  onClick={() => {
                    setMenuOpen(false);
                    // TODO: logout
                  }}
                >
                  Log out
                </button>
              </div>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

export default Header;
