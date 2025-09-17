// app/hooks/use-user-profile.ts
"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot, type DocumentData } from "firebase/firestore";
import { db } from "@/libs/firebase/config";

export function useUserProfile(uid?: string | null) {
  const [profile, setProfile] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(Boolean(uid));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ref = doc(db, "users", uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setProfile(snap.exists() ? snap.data() : null);
        setLoading(false);
      },
      (err) => {
        setError(err.message || "Gagal memuat profil");
        setLoading(false);
      }
    );
    return () => unsub();
  }, [uid]);

  return { profile, loading, error };
}
