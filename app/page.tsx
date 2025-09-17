// app/page.tsx
"use client";

import FullScreenLoader from "@/app/components/addons/FullScreenLoader";
import { useAuthGuard } from "@/app/hooks/use-auth-guard";
import { useUserProfile } from "@/app/hooks/use-user-profile";

export default function HomePage() {
  const { user, checking } = useAuthGuard("/account/sign-in", { enforceVerified: true });
  const { profile, loading: profileLoading } = useUserProfile(user?.uid);

  if (checking || !user) return <FullScreenLoader />;

  const name = (profile?.displayName as string) || user.displayName || user.email;

  return (
    <main className="p-4">
      <h1 className="text-2xl font-semibold">Halo, {profileLoading ? "…" : name} 👋</h1>
    </main>
  );
}
