"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";

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
      <div className="relative flex h-16 items-center">
        {/* Logo + brand */}
        <Link href="/" className="group flex items-center rounded-xl px-4 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40">
          <Image src={"/talance-logo.png"} alt="Talance Logo" width={40} height={40} />
        </Link>
        <div>
          <span>Talance Seller</span>
        </div>

        {/* Right: controls */}
        <div className="ml-auto flex items-center gap-2">
          {/* === MOBILE ICONS (diposisikan di kiri toggle) === */}
          <Link
            href="/notifications"
            aria-label="Notifikasi"
            className="inline-flex md:hidden h-10 w-10 items-center justify-center rounded-xl text-black hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            title="Notifikasi"
          >
            <svg width={22} height={22} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <title />
              <g id="bell">
                <path d="M29.78,24.37l-3.65-4.48L26,12a1,1,0,0,0,0-.16C24.85,5.58,21.21,2,16,2,10.5,2,6.08,6,5,11.82A1,1,0,0,0,5,12l-.13,8L2.14,24.48a1,1,0,0,0,0,1A1,1,0,0,0,3,26h9a4,4,0,0,0,8,0h9a1,1,0,0,0,.9-.57A1,1,0,0,0,29.78,24.37ZM16,28a2,2,0,0,1-2-2h4A2,2,0,0,1,16,28ZM4.77,24l2-3.24a1,1,0,0,0,.14-.5L7,12.1C7.91,7.25,11.52,4,16,4c5.63,0,7.43,5,8,8.1l.14,8.16a1,1,0,0,0,.22.62L26.9,24Z" />
              </g>
            </svg>
          </Link>

          <Link
            href="/inbox"
            aria-label="Inbox"
            className="inline-flex md:hidden h-10 w-10 items-center justify-center rounded-xl text-black hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            title="Inbox"
          >
            <svg width="22" height="24" viewBox="0 0 36 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path
                d="M33 24H3C1.3455 24 0 22.6545 0 21V3C0 1.3455 1.3455 0 3 0H33C34.6545 0 36 1.3455 36 3V21C36 22.6545 34.6545 24 33 24ZM3 1.5C2.17275 1.5 1.5 2.17275 1.5 3V21C1.5 21.8272 2.17275 22.5 3 22.5H33C33.8273 22.5 34.5 21.8272 34.5 21V3C34.5 2.17275 33.8273 1.5 33 1.5H3Z"
                fill="black"
              />
              <path
                d="M18 15.8933L4.84275 7.38C4.49475 7.15425 4.395 6.69075 4.62 6.34275C4.845 5.99475 5.30925 5.89575 5.65725 6.12L18 14.1068L30.3428 6.12C30.6908 5.89575 31.155 5.99475 31.38 6.34275C31.605 6.69075 31.5052 7.15425 31.1572 7.38L18 15.8933Z"
                fill="black"
              />
              <path
                d="M4.50075 19.5C4.2585 19.5 4.02 19.383 3.876 19.1663C3.64575 18.8213 3.73875 18.3562 4.08375 18.126L10.8337 13.626C11.1787 13.3958 11.6445 13.4888 11.874 13.8338C12.1042 14.1788 12.0113 14.6438 11.6663 14.874L4.91625 19.374C4.788 19.4588 4.64325 19.5 4.50075 19.5Z"
                fill="black"
              />
              <path
                d="M31.4993 19.5C31.3568 19.5 31.212 19.4588 31.0838 19.374L24.3337 14.874C23.9887 14.6438 23.8957 14.1788 24.126 13.8338C24.3555 13.4888 24.8205 13.3958 25.1663 13.626L31.9163 18.126C32.2613 18.3562 32.3543 18.8213 32.124 19.1663C31.98 19.383 31.7415 19.5 31.4993 19.5Z"
                fill="black"
              />
            </svg>
          </Link>

          {/* Mobile menu toggle (tetap di paling kanan) */}
          <button
            aria-label="Toggle menu"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-black hover:bg-black md:hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              {menuOpen ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>

          {/* === DESKTOP ICONS === */}
          <Link
            href="/notifications"
            aria-label="Notifikasi"
            className="hidden md:inline-flex h-10 w-10 items-center justify-center rounded-xl text-black hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            title="Notifikasi"
          >
            <svg width={22} height={22} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <title />
              <g id="bell">
                <path d="M29.78,24.37l-3.65-4.48L26,12a1,1,0,0,0,0-.16C24.85,5.58,21.21,2,16,2,10.5,2,6.08,6,5,11.82A1,1,0,0,0,5,12l-.13,8L2.14,24.48a1,1,0,0,0,0,1A1,1,0,0,0,3,26h9a4,4,0,0,0,8,0h9a1,1,0,0,0,.9-.57A1,1,0,0,0,29.78,24.37ZM16,28a2,2,0,0,1-2-2h4A2,2,0,0,1,16,28ZM4.77,24l2-3.24a1,1,0,0,0,.14-.5L7,12.1C7.91,7.25,11.52,4,16,4c5.63,0,7.43,5,8,8.1l.14,8.16a1,1,0,0,0,.22.62L26.9,24Z" />
              </g>
            </svg>
          </Link>

          <Link
            href="/inbox"
            aria-label="Inbox"
            className="hidden md:inline-flex h-10 w-10 items-center justify-center rounded-xl text-black hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            title="Inbox"
          >
            <svg width="22" height="24" viewBox="0 0 36 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path
                d="M33 24H3C1.3455 24 0 22.6545 0 21V3C0 1.3455 1.3455 0 3 0H33C34.6545 0 36 1.3455 36 3V21C36 22.6545 34.6545 24 33 24ZM3 1.5C2.17275 1.5 1.5 2.17275 1.5 3V21C1.5 21.8272 2.17275 22.5 3 22.5H33C33.8273 22.5 34.5 21.8272 34.5 21V3C34.5 2.17275 33.8273 1.5 33 1.5H3Z"
                fill="black"
              />
              <path
                d="M18 15.8933L4.84275 7.38C4.49475 7.15425 4.395 6.69075 4.62 6.34275C4.845 5.99475 5.30925 5.89575 5.65725 6.12L18 14.1068L30.3428 6.12C30.6908 5.89575 31.155 5.99475 31.38 6.34275C31.605 6.69075 31.5052 7.15425 31.1572 7.38L18 15.8933Z"
                fill="black"
              />
              <path
                d="M4.50075 19.5C4.2585 19.5 4.02 19.383 3.876 19.1663C3.64575 18.8213 3.73875 18.3562 4.08375 18.126L10.8337 13.626C11.1787 13.3958 11.6445 13.4888 11.874 13.8338C12.1042 14.1788 12.0113 14.6438 11.6663 14.874L4.91625 19.374C4.788 19.4588 4.64325 19.5 4.50075 19.5Z"
                fill="black"
              />
              <path
                d="M31.4993 19.5C31.3568 19.5 31.212 19.4588 31.0838 19.374L24.3337 14.874C23.9887 14.6438 23.8957 14.1788 24.126 13.8338C24.3555 13.4888 24.8205 13.3958 25.1663 13.626L31.9163 18.126C32.2613 18.3562 32.3543 18.8213 32.124 19.1663C31.98 19.383 31.7415 19.5 31.4993 19.5Z"
                fill="black"
              />
            </svg>
          </Link>

          {/* Desktop-only Profile dropdown */}
          <div className="relative hidden md:block" ref={profileRef}>
            <button
              onClick={() => setProfileOpen((v) => !v)}
              className="group inline-flex items-center gap-2 rounded-xl bg-white px-2 py-1.5 text-black hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
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
              <div role="menu" className="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border border-white bg-white p-1.5 shadow-2xl ring-1 ring-white/10 backdrop-blur text-black">
                <Link href="/profile" role="menuitem" className="block rounded-lg px-3 py-2 text-sm text-black hover:bg-white/10" onClick={() => setProfileOpen(false)}>
                  Profile
                </Link>
                <Link href="/settings" role="menuitem" className="block rounded-lg px-3 py-2 text-sm text-black hover:bg-white/10" onClick={() => setProfileOpen(false)}>
                  Settings
                </Link>
                <div className="my-1 h-px bg-white/10" />
                <button
                  role="menuitem"
                  className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-600 hover:text-white"
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
            {/* Profile area for mobile */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-white/10 ring-1 ring-white/15">
                  <span className="text-sm font-medium text-black">GM</span>
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-black">Seller Akun</p>
                  <p className="text-xs text-black">Akun</p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link href="/profile" className="rounded-lg px-3 py-2 text-sm text-black hover:bg-white/10 border text-center" onClick={() => setMenuOpen(false)}>
                  Profile
                </Link>
                <Link href="/settings" className="rounded-lg px-3 py-2 text-sm black hover:bg-black border text-center" onClick={() => setMenuOpen(false)}>
                  Settings
                </Link>
                <button
                  className="col-span-2 rounded-lg px-3 py-2 text-sm text-white bg-red-500 hover:bg-red-400/10"
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
