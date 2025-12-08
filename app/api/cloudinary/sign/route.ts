// app/api/cloudinary/sign/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReqBody = {
  folder?: string;
  publicId?: string;
  resourceType?: "image" | "raw";
};

export async function POST(req: Request) {
  try {
    const body: ReqBody = await req.json().catch(() => ({} as ReqBody));
    const folder = String(body.folder || "").trim();
    const publicId =
      typeof body.publicId === "string" && body.publicId.trim()
        ? body.publicId.trim()
        : undefined;
    const resourceType = body.resourceType === "raw" ? "raw" : "image";

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      console.error("[/api/cloudinary/sign] Missing Cloudinary env vars", {
        cloudName: !!cloudName,
        apiKey: !!apiKey,
        apiSecret: !!apiSecret,
      });
      return NextResponse.json(
        { error: "Missing Cloudinary env" },
        { status: 500 }
      );
    }

    if (!folder) {
      return NextResponse.json({ error: "folder required" }, { status: 400 });
    }

    const timestamp = Math.floor(Date.now() / 1000);

    const params: Record<string, string | number> = { folder, timestamp };
    if (publicId) params.public_id = publicId;

    const toSign = Object.keys(params)
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join("&");

    // For debugging locally you can log toSign. Remove in production.
    console.debug("[/api/cloudinary/sign] toSign:", toSign);

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
      resourceType,
    });
  } catch (err) {
    console.error("[/api/cloudinary/sign] unexpected error:", err);
    return NextResponse.json(
      { error: "sign failed", details: (err as Error)?.message ?? null },
      { status: 500 }
    );
  }
}
