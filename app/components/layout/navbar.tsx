// components/layout/navbar.tsx
"use client";
import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import { signOut } from "firebase/auth";
import { firebaseAuth } from "@/libs/firebase/config";

const Sidebar: React.FC<{ onToggle: (isOpen: boolean) => void }> = ({ onToggle }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [openGroups, setOpenGroups] = useState<{ orders: boolean; products: boolean }>({
    orders: true,
    products: true,
  });
  const asideRef = useRef<HTMLDivElement>(null);

  const updateSidebarVar = () => {
    if (typeof window === "undefined") return;
    const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
    if (!isDesktop) {
      document.documentElement.style.setProperty("--sb-w", "0px");
      return;
    }
    const w = asideRef.current?.offsetWidth ?? 0;
    document.documentElement.style.setProperty("--sb-w", `${w}px`);
  };

  useEffect(() => {
    updateSidebarVar();
    const onWinResize = () => updateSidebarVar();
    window.addEventListener("resize", onWinResize);
    const ro = new ResizeObserver(() => updateSidebarVar());
    if (asideRef.current) ro.observe(asideRef.current);
    return () => {
      window.removeEventListener("resize", onWinResize);
      ro.disconnect();
    };
  }, []);

  useEffect(() => {
    updateSidebarVar();
  }, [isOpen]);

  const toggleSidebar = () => {
    const next = !isOpen;
    setIsOpen(next);
    onToggle(next);
  };

  const handleLogout = async () => {
    try {
      await signOut(firebaseAuth);
      window.location.href = "/";
    } catch (error) {
      console.error("Gagal logout:", error);
    }
  };

  // Arrow untuk header grup (tetap)
  const ArrowIcon: React.FC<{ open: boolean }> = ({ open }) => (
    <svg
      className={`h-4 w-4 flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : "rotate-0"}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
    </svg>
  );

  const iconPlus = (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16M4 12h16" />
    </svg>
  );
  const iconMenu = (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
  const iconBox = (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16v3a2 2 0 010 4v3H4v-3a2 2 0 010-4V8z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10v4M16 10v4" />
    </svg>
  );

  const groups: Array<{
    key: keyof typeof openGroups;
    title: string;
    items: Array<{ href: string; label: string; icon: React.ReactNode }>;
  }> = [
    {
      key: "orders",
      title: "Pesanan",
      items: [
        { href: "/order", label: "Pesanan Saya", icon: iconPlus },
        { href: "/pembatalan", label: "Pembatalan Pesanan", icon: iconMenu },
      ],
    },
    {
      key: "products",
      title: "Produk",
      items: [{ href: "/product", label: "Produk Saya", icon: iconBox }],
    },
  ];

  const toggleGroup = (key: keyof typeof openGroups) => setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <>
      <div
        ref={asideRef}
        className={[
          "hidden md:block fixed top-16 left-0 z-30 h-[calc(100vh-64px)] overflow-hidden",
          "bg-gradient-to-b from-white to-white shadow-xs",
          "transition-all duration-300 ease-in-out",
          isOpen ? "md:w-1/6 md:max-w-md" : "md:w-16",
        ].join(" ")}
      >
        <div className="flex h-full flex-col">
          {/* Toggle sidebar — sejajarkan dgn header grup */}
          <div className="px-3 pb-3">
            <div className="rounded-xl border border-slate-100">
              <button
                onClick={toggleSidebar}
                className={[
                  "w-full flex items-center text-black transition-colors hover:text-green-800",
                  // ⬇️ KUNCI: align cond. sama seperti header grup
                  isOpen ? "justify-end px-4 py-3" : "justify-center px-3 py-3",
                ].join(" ")}
                aria-label={isOpen ? "Tutup sidebar" : "Buka sidebar"}
                title={isOpen ? "Tutup" : "Buka"}
              >
                {/* Ikon chevron ganda (asli) */}
                <svg
                  className={`h-4 w-4 flex-shrink-0 transition-transform duration-300 ${isOpen ? "rotate-0" : "rotate-180"}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Groups */}
          <nav className="flex-1 px-3">
            <ul className="space-y-3">
              {groups.map((group) => {
                const open = openGroups[group.key];
                return (
                  <li key={group.key} className="rounded-xl border border-slate-100">
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.key)}
                      className={["w-full flex items-center", isOpen ? "justify-between px-4 py-3" : "justify-center px-3 py-3", "text-black hover:text-green-800 transition-colors"].join(" ")}
                      aria-expanded={open}
                      aria-controls={`group-panel-${group.key}`}
                    >
                      {isOpen ? (
                        <>
                          <span className="text-xs font-medium">{group.title}</span>
                          <ArrowIcon open={open} />
                        </>
                      ) : (
                        <ArrowIcon open={open} />
                      )}
                    </button>

                    <div id={`group-panel-${group.key}`} className={`overflow-hidden transition-[max-height,opacity] duration-200 ease-in-out ${open ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}>
                      <ul className="px-2 pb-2 pt-0 space-y-1">
                        {group.items.map((item) => (
                          <li key={item.href}>
                            <Link href={item.href} className="group block">
                              <div
                                className={["flex items-center rounded-xl border border-transparent", "hover:text-green-800 text-black", isOpen ? "px-4 py-3" : "justify-center px-3 py-3"].join(" ")}
                              >
                                <span className="flex-shrink-0 text-black transition-colors group-hover:text-green-800">{item.icon}</span>
                                {isOpen && <span className="ml-3 whitespace-nowrap text-xs transition-colors group-hover:text-green-800">{item.label}</span>}
                              </div>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="border-t border-slate-100 p-4">
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className={["flex w-full items-center rounded-xl px-4 py-3 text-left transition-all", isOpen ? "justify-start" : "justify-center", "text-red-400 hover:bg-red-500 hover:text-white"].join(
                " "
              )}
            >
              <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4-4-4M21 12H7" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 5V4a2 2 0 00-2-2H7a2 2 0 00-2 2v16a2 2 0 002 2h4a2 2 0 002-2v-1" />
              </svg>
              {isOpen && <span className="ml-2 font-medium">Logout</span>}
            </button>
          </div>
        </div>
      </div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 text-center shadow-lg">
            <h2 className="text-xl font-semibold text-gray-800">Apakah Anda yakin ingin keluar?</h2>
            <div className="mt-6 flex justify-center gap-4">
              <button onClick={handleLogout} className="rounded-lg bg-red-600 px-6 py-2 text-white transition hover:bg-red-700">
                Yes
              </button>
              <button onClick={() => setShowLogoutConfirm(false)} className="rounded-lg bg-gray-200 px-6 py-2 text-gray-800 transition hover:bg-gray-300">
                No
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
