// app/api/products/[id]/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID!;
const CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL!;
const PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")!;

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: PROJECT_ID,
      clientEmail: CLIENT_EMAIL,
      privateKey: PRIVATE_KEY,
    }),
  });
}

async function deleteCloudinary(publicIds: string[]) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret || !publicIds.length) {
    return { ok: false, reason: "missing_cloudinary_env_or_empty" as const };
  }

  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/resources/image/upload`;
  const params = new URLSearchParams();
  publicIds.forEach((pid) => params.append("public_ids[]", pid));
  params.append("invalidate", "true");
  const authHeader = "Basic " + Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

  try {
    const resp = await fetch(`${endpoint}?${params.toString()}`, {
      method: "DELETE",
      headers: { Authorization: authHeader },
    });
    const text = await resp.text();
    return { ok: resp.ok, status: resp.status, body: text as string };
  } catch (e: any) {
    console.error("[api] cloudinary delete error:", e);
    return { ok: false, error: String(e) };
  }
}

// NOTE: Next.js new typing: context.params is a Promise
export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: productId } = await context.params;

    const authHeader = req.headers.get("authorization") || "";
    const m = authHeader.match(/^Bearer (.+)$/i);
    if (!m) {
      return NextResponse.json({ error: "missing_token" }, { status: 401 });
    }

    const idToken = m[1];
    const decoded = await getAuth()
      .verifyIdToken(idToken)
      .catch((e) => {
        console.error("[api] verifyIdToken error:", e);
        return null;
      });
    if (!decoded) {
      return NextResponse.json({ error: "invalid_token" }, { status: 401 });
    }

    const uid = decoded.uid;
    const db = getFirestore();

    const ref = db.doc(`users/${uid}/products/${productId}`);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const data = snap.data() || {};
    if (data.ownerId && data.ownerId !== uid) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const publicIds: string[] = Array.isArray(data?.media?.publicIds) ? data.media.publicIds.filter(Boolean) : [];

    // delete Firestore doc first (don’t block on Cloudinary)
    await ref.delete();

    // best-effort Cloudinary cleanup
    const cloud = await deleteCloudinary(publicIds);
    if (!cloud.ok) {
      console.warn("[api] cloudinary delete failed:", cloud);
      return NextResponse.json({ ok: true, cloudinary: cloud, note: "doc_deleted_cloudinary_failed" });
    }

    return NextResponse.json({ ok: true, cloudinary: cloud });
  } catch (e: any) {
    console.error("[api] delete product error:", e);
    return NextResponse.json({ error: "internal", detail: String(e?.message || e) }, { status: 500 });
  }
}
