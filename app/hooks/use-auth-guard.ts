"use client";

import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { firebaseAuth as auth } from "@/libs/firebase/config";

type Options = {
  enforceVerified?: boolean; // jika true, user dengan emailVerified=false dipaksa ke /account/verify-email
  redirectIfNoUser?: string; // redirect bila tidak login
};

export function useAuthGuard(redirectIfNoUser: string = "/account/sign-in", options: Options = { enforceVerified: false }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const startedOTPRef = useRef(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);

      if (!u) {
        setChecking(false);
        if (redirectIfNoUser) router.replace(redirectIfNoUser);
        return;
      }

      // pastikan status emailVerified terbaru
      try {
        await u.reload();
      } catch {}
      const me = auth.currentUser;

      // kalau di-enforce verified dan user punya email tapi belum verified
      if (options.enforceVerified && me?.email && !me.emailVerified) {
        if (!startedOTPRef.current) {
          startedOTPRef.current = true;
          try {
            const idToken = await me.getIdToken();
            // panggil server untuk (re)generate OTP + set cookie ve_sid
            await fetch("/api/auth/start-email-otp", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ idToken }),
            });
          } catch {
            // diamkan saja; halaman verify tetap terbuka, user bisa tekan "Kirim ulang"
          }
        }
        router.replace("/account/verify-email");
        setChecking(false);
        return;
      }

      setChecking(false);
    });

    return () => unsub();
  }, [router, redirectIfNoUser, options.enforceVerified]);

  return { user, checking };
}
