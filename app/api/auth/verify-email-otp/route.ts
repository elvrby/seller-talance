// app/api/auth/verify-email-otp/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { cookies as nextCookies } from "next/headers";
import crypto from "crypto";
import { adminAuth, adminDb } from "@/libs/firebase/admin"; // ⬅️ pakai export langsung
import { FieldValue } from "firebase-admin/firestore";
import type {
  Transaction,
  QueryDocumentSnapshot,
} from "firebase-admin/firestore"; // ⬅️ tipe

const COOKIE_NAME = "ve_sid";
const MAX_TRIES = 5;

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const code = (body.code as string | undefined)?.trim();
    const idToken = (body.idToken as string | undefined) || "";

    if (!code || !/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: "Kode OTP tidak valid" },
        { status: 400 }
      );
    }
    if (!idToken) {
      return NextResponse.json({ error: "Missing idToken" }, { status: 401 });
    }

    // Next 15: cookies() -> Promise (kalau masih Next 14, hapus "await")
    const jar = await nextCookies();
    const sid = jar.get(COOKIE_NAME)?.value;
    if (!sid) {
      return NextResponse.json(
        { error: "Sesi verifikasi tidak ditemukan" },
        { status: 400 }
      );
    }

    // Pastikan user yang memverifikasi = user yang login sekarang
    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;

    // Ambil sesi OTP
    const ref = adminDb.collection("emailOtpSessions").doc(sid);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json(
        { error: "Sesi tidak valid atau kadaluwarsa" },
        { status: 400 }
      );
    }
    const data = snap.data() as {
      uid: string;
      salt: string;
      codeHash: string;
      expiresAt: number;
      tries?: number;
    };

    if (data.uid !== uid) {
      return NextResponse.json(
        { error: "Sesi tidak cocok dengan pengguna" },
        { status: 403 }
      );
    }

    const now = Date.now();
    if (now > data.expiresAt) {
      await ref.delete();
      const res = NextResponse.json(
        { error: "Kode kadaluwarsa. Minta kode baru." },
        { status: 400 }
      );
      res.cookies.set({ name: COOKIE_NAME, value: "", path: "/", maxAge: 0 });
      return res;
    }

    if ((data.tries ?? 0) >= MAX_TRIES) {
      await ref.delete();
      const res = NextResponse.json(
        { error: "Terlalu banyak percobaan. Minta kode baru." },
        { status: 429 }
      );
      res.cookies.set({ name: COOKIE_NAME, value: "", path: "/", maxAge: 0 });
      return res;
    }

    // Cek kode (hash)
    const ok = sha256(data.salt + code) === data.codeHash;
    if (!ok) {
      // Tambah attempts secara ATOMIK
      await adminDb.runTransaction(async (tx: Transaction) => {
        // ⬅️ tipe tx
        const fresh = await tx.get(ref);
        if (!fresh.exists) return;
        const d = fresh.data() as { tries?: number };
        const next = (d.tries ?? 0) + 1;
        if (next >= MAX_TRIES) {
          tx.delete(ref);
        } else {
          tx.update(ref, { tries: next });
        }
      });
      return NextResponse.json({ error: "Kode OTP salah" }, { status: 400 });
    }

    // ✅ 1) Set emailVerified: true di Firebase Auth
    await adminAuth.updateUser(uid, { emailVerified: true });

    // ✅ 2) Update Firestore users/{uid}
    const userDocRef = adminDb.collection("users").doc(uid);
    await userDocRef.set(
      {
        emailVerified: true,
        emailVerifiedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // 🧹 3) Bersihkan SEMUA sesi OTP milik UID ini (termasuk yang aktif)
    const all = await adminDb
      .collection("emailOtpSessions")
      .where("uid", "==", uid)
      .get();
    if (!all.empty) {
      let batch = adminDb.batch();
      let count = 0;

      for (const doc of all.docs as QueryDocumentSnapshot[]) {
        // ⬅️ tipe doc
        batch.delete(doc.ref);
        count++;
        if (count === 450) {
          await batch.commit(); // penting
          batch = adminDb.batch();
          count = 0;
        }
      }
      if (count > 0) {
        await batch.commit();
      }
    }

    // 🧹 4) Hapus cookie sesi
    const res = NextResponse.json({ ok: true });
    res.cookies.set({ name: COOKIE_NAME, value: "", path: "/", maxAge: 0 });
    return res;
  } catch (e: any) {
    console.error("[verify-email-otp] error:", e?.code || e?.name, e?.message);
    return NextResponse.json(
      { error: "Gagal memverifikasi kode" },
      { status: 500 }
    );
  }
}
