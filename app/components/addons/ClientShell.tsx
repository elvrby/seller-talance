// app/components/ClientShell.tsx
"use client";

import React, { useState } from "react";
import Header from "../layout/header";
import Navbar from "../layout/navbar";

export default function ClientShell({ children }: { children: React.ReactNode }) {
  const [, setSidebarOpen] = useState(true);

  return (
    <>
      <Header />
      <Navbar onToggle={setSidebarOpen} />
      <main className="transition-[margin] duration-10 p-4 sm:p-6 lg:px-8 lg:py-2" style={{ marginLeft: "var(--sb-w, 0px)" }}>
        {children}
      </main>
    </>
  );
}
