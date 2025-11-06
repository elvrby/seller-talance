// hooks/use-auth-guard.ts
"use client";

import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useRouter, usePathname } from "next/navigation";
import { firebaseAuth as auth } from "@/libs/firebase/config";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/libs/firebase/config";

type Options = {
  enforceVerified?: boolean;
  enforceFreelanceComplete?: boolean;
  enforceFormAfterVerified?: boolean;
  freelanceFormPath?: string;
  redirectIfNoUser?: string;
  exemptPaths?: string[];
};

export function useAuthGuard(
  redirectIfNoUser: string = "/account/sign-in",
  options: Options = { enforceVerified: false, enforceFreelanceComplete: false }
) {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const startedOTPRef = useRef(false);

  const freelanceFormPath =
    options.freelanceFormPath || "/account/freelance-form";
  const enforceFormAfterVerified = options.enforceFormAfterVerified ?? true;

  const EXEMPT = new Set<string>([
    "/account/sign-up",
    "/account/sign-in",
    "/account/verify-email",
    "/account/reset-password",
    freelanceFormPath,
    ...(options.exemptPaths || []),
  ]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);

      if (!u) {
        setChecking(false);
        router.replace(options.redirectIfNoUser || redirectIfNoUser);
        return;
      }

      try {
        await u.reload();
      } catch {}
      try {
        await u.getIdToken(true);
      } catch {}

      if (
        options.enforceVerified &&
        u.email &&
        !u.emailVerified &&
        pathname !== "/account/verify-email"
      ) {
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

      const shouldCheckForm =
        options.enforceFreelanceComplete &&
        !EXEMPT.has(pathname) &&
        (!enforceFormAfterVerified || !u.email || u.emailVerified);

      if (shouldCheckForm) {
        try {
          const snap = await getDoc(doc(db, "users", u.uid));
          const data = snap.exists() ? snap.data() : null;
          const done = Boolean(
            (data as any)?.onboarding?.freelanceFormCompleted
          );
          if (!done) {
            router.replace(freelanceFormPath);
            setChecking(false);
            return;
          }
        } catch {
          // ignore read error
        }
      }

      setChecking(false);
    });

    return () => unsub();
  }, [
    router,
    pathname,
    redirectIfNoUser,
    options.enforceVerified,
    options.enforceFreelanceComplete,
    options.redirectIfNoUser,
    freelanceFormPath,
    enforceFormAfterVerified,
  ]);

  return { user, checking };
}
