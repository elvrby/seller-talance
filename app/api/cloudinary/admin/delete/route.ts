// app/api/cloudinary/admin/delete/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { publicIds } = await req.json();
    if (!Array.isArray(publicIds) || publicIds.length === 0) {
      return NextResponse.json({ ok: true, deleted: [] });
    }

    const cloud = process.env.CLOUDINARY_CLOUD_NAME!;
    const key = process.env.CLOUDINARY_API_KEY!;
    const secret = process.env.CLOUDINARY_API_SECRET!;
    if (!cloud || !key || !secret) {
      return NextResponse.json({ error: "Cloudinary env missing" }, { status: 500 });
    }

    // Hapus satu per satu: DELETE /resources/image/upload/{public_id}
    const results: Array<{ id: string; ok: boolean }> = [];
    for (const pid of publicIds) {
      const url = `https://api.cloudinary.com/v1_1/${cloud}/resources/image/upload/${encodeURIComponent(pid)}`;
      const resp = await fetch(url, {
        method: "DELETE",
        headers: {
          Authorization: "Basic " + Buffer.from(`${key}:${secret}`).toString("base64"),
        },
      });
      results.push({ id: pid, ok: resp.ok });
    }

    return NextResponse.json({ ok: true, deleted: results });
  } catch (e) {
    return NextResponse.json({ error: "delete failed" }, { status: 500 });
  }
}
