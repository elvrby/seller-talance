// app/api/cloudinary/sign/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Body JSON:
 * {
 *   folder: string;               // contoh "products/images"
 *   resourceType?: "image"|"raw"; // opsional (tidak mempengaruhi signature)
 *   publicId?: string;            // kalau kamu set public_id saat upload, WAJIB disertakan ke signature
 * }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const folder = String(body.folder || "");
    const publicId: string | undefined = typeof body.publicId === "string" && body.publicId.trim() ? body.publicId.trim() : undefined;

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json({ error: "Missing Cloudinary env" }, { status: 500 });
    }
    if (!folder) {
      return NextResponse.json({ error: "folder required" }, { status: 400 });
    }

    const timestamp = Math.floor(Date.now() / 1000);

    // -- Build string_to_sign (sorted by key, only fields that you actually send to Cloudinary) --
    // contoh: "folder=products/images&public_id=nama-file&timestamp=1712345678"
    const params: Record<string, string | number> = { folder, timestamp };
    if (publicId) params.public_id = publicId;

    const toSign = Object.keys(params)
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join("&");

    const signature = crypto
      .createHash("sha1")
      .update(toSign + apiSecret)
      .digest("hex");

    return NextResponse.json({
      timestamp,
      folder,
      signature,
      apiKey,
      cloudName,
    });
  } catch (e) {
    return NextResponse.json({ error: "sign failed" }, { status: 500 });
  }
}
