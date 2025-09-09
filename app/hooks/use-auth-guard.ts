// app/hooks/use-auth-guard.ts
"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { firebaseAuth } from "@/libs/firebase/config";

export function useAuthGuard(redirectTo = "/account/sign-up") {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(firebaseAuth, (u) => {
      if (!u) {
        router.replace(redirectTo);
      } else {
        setUser(u);
      }
      setChecking(false);
    });
    return () => unsub();
  }, [router, redirectTo]);

  return { user, checking };
}
