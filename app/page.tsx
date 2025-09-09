// app/page.tsx
"use client";

import FullScreenLoader from "@/app/components/addons/FullScreenLoader";
import { useAuthGuard } from "@/app/hooks/use-auth-guard";

export default function HomePage() {
  const { user, checking } = useAuthGuard("/account/sign-up");

  if (checking || !user) return <FullScreenLoader />;

  return (
    <main className="p-4">
      {/* …isi halaman Home kamu… */}
      <h1 className="text-2xl font-semibold">Dashboard / Home</h1>
    </main>
  );
}
