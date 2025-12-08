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

/** Simple Cloudinary deletion helper (try SDK then fallback to HTTP) */
async function deleteCloudinary(publicIds: string[]) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return { ok: false, reason: "missing_cloudinary_env" as const };
  }

  if (!publicIds || publicIds.length === 0) {
    return { ok: true, reason: "no_public_ids" as const };
  }

  try {
    // prefer SDK if installed
    // npm install cloudinary
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cloudinary = require("cloudinary");
    cloudinary.v2.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });
    const result = await cloudinary.v2.api.delete_resources(publicIds, {
      resource_type: "image",
      invalidate: true,
    });
    return { ok: true, body: result };
  } catch (sdkErr) {
    // fallback to HTTP
    try {
      const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/resources/image/upload`;
      const params = new URLSearchParams();
      publicIds.forEach((pid) => params.append("public_ids[]", pid));
      params.append("invalidate", "true");
      const authHeader =
        "Basic " + Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

      const resp = await fetch(`${endpoint}?${params.toString()}`, {
        method: "DELETE",
        headers: { Authorization: authHeader },
      });

      const text = await resp.text();
      return { ok: resp.ok, status: resp.status, body: text };
    } catch (httpErr: any) {
      console.error("[api] cloudinary fallback error:", httpErr);
      return { ok: false, error: String(httpErr) };
    }
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: docId } = await context.params;

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

    // 1) Try delete under users/{uid}/products/{docId}
    const ownerRef = db.doc(`users/${uid}/products/${docId}`);
    const ownerSnap = await ownerRef.get();

    let collectedProductData: any = null;

    if (ownerSnap.exists) {
      collectedProductData = ownerSnap.data();
      await ownerRef.delete();
    }

    // 2) Try delete top-level /products/{docId}
    const topRef = db.doc(`products/${docId}`);
    const topSnap = await topRef.get();

    // topData typed possibly undefined — use conditional assignment
    const topData = topSnap.exists ? topSnap.data() : undefined;

    if (topSnap.exists) {
      // optional owner check: only delete if owner matches or owner not set
      if (!topData?.ownerId || topData.ownerId === uid) {
        await topRef.delete();
      } else {
        // if top-level is owned by someone else, deny (or skip based on policy)
        return NextResponse.json(
          { error: "forbidden_top_level" },
          { status: 403 }
        );
      }
      if (!collectedProductData) collectedProductData = topData;
    }

    // 3) Optional: find other copies via collectionGroup if necessary
    //    If you want to remove any other duplicates that store the same productId field:
    // const qSnapshot = await db.collectionGroup("products").where("productId", "==", docId).get();
    // for (const d of qSnapshot.docs) {
    //   if (d.ref.path === ownerRef.path || d.ref.path === topRef.path) continue;
    //   // optionally check ownerId before deleting
    //   await d.ref.delete();
    //   if (!collectedProductData) collectedProductData = d.data();
    // }

    // 4) Cloudinary cleanup (best-effort). collect publicIds from possible places
    const publicIdsRoot: string[] = Array.isArray(
      collectedProductData?.publicIds
    )
      ? collectedProductData.publicIds
      : [];
    const publicIdsMedia: string[] = Array.isArray(
      collectedProductData?.media?.publicIds
    )
      ? collectedProductData.media.publicIds
      : [];
    const publicIds = Array.from(
      new Set([...publicIdsRoot, ...publicIdsMedia].filter(Boolean))
    );

    const cloud = await deleteCloudinary(publicIds);

    if (!cloud.ok) {
      console.warn("[api] cloudinary cleanup issue:", cloud);
      return NextResponse.json({
        ok: true,
        note: "deleted_but_cloudinary_cleanup_failed",
        cloudinary: cloud,
      });
    }

    return NextResponse.json({ ok: true, cloudinary: cloud });
  } catch (err: any) {
    console.error("[api] delete product error:", err);
    return NextResponse.json(
      { error: "internal", detail: String(err?.message || err) },
      { status: 500 }
    );
  }
}
