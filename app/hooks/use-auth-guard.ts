"use client";

import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useRouter, usePathname } from "next/navigation";
import { firebaseAuth as auth } from "@/libs/firebase/config";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/libs/firebase/config";

type Options = {
  enforceVerified?: boolean; // blokir user belum verif → /account/verify-email
  enforceFreelanceComplete?: boolean; // paksa isi freelance form dulu
  freelanceFormPath?: string; // default: "/account/freelance-form"
  redirectIfNoUser?: string; // default: "/account/sign-in"
};

export function useAuthGuard(redirectIfNoUser: string = "/account/sign-in", options: Options = { enforceVerified: false, enforceFreelanceComplete: false }) {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const startedOTPRef = useRef(false);

  const freelanceFormPath = options.freelanceFormPath || "/account/freelance-form";

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);

      if (!u) {
        setChecking(false);
        router.replace(options.redirectIfNoUser || redirectIfNoUser);
        return;
      }

      // Segarkan status auth (emailVerified)
      try {
        await u.reload();
      } catch {}
      try {
        await u.getIdToken(true);
      } catch {}

      // 1) Wajib verified?
      if (options.enforceVerified && u.email && !u.emailVerified) {
        if (!startedOTPRef.current) {
          startedOTPRef.current = true;
          try {
            const idToken = await u.getIdToken();
            await fetch("/api/auth/start-email-otp", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ idToken }),
            });
          } catch {}
        }
        router.replace("/account/verify-email");
        setChecking(false);
        return;
      }

      // 2) Wajib selesai form freelancer?
      if (options.enforceFreelanceComplete && pathname !== freelanceFormPath) {
        try {
          const snap = await getDoc(doc(db, "users", u.uid));
          const data = snap.exists() ? snap.data() : null;
          const done = Boolean(data?.onboarding?.freelanceFormCompleted);
          if (!done) {
            router.replace(freelanceFormPath);
            setChecking(false);
            return;
          }
        } catch {
          // kalau gagal baca doc, tetap arahkan ke form
          router.replace(freelanceFormPath);
          setChecking(false);
          return;
        }
      }

      setChecking(false);
    });

    return () => unsub();
  }, [router, pathname, redirectIfNoUser, options.enforceVerified, options.enforceFreelanceComplete, options.redirectIfNoUser, freelanceFormPath]);

  return { user, checking };
}
