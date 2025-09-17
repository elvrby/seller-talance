// app/lib/deferredMedia.ts
"use client";

/**
 * Pending file yang disimpan SEMENTARA di localStorage (dataURL).
 */
export type PendingFile = {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
};

type BucketData = {
  files: PendingFile[];
  deletes: string[]; // daftar public_id ATAU secure_url untuk dihapus saat submit
};

const COOKIE_NAME = "pf_bucket"; // pointer cookie -> bucketId
const LS_PREFIX = "pf:bucket:"; // localStorage key prefix

/** Type guard pembantu */
export const isString = (v: unknown): v is string => typeof v === "string" && v.length > 0;

/* ---------------- Cookie helpers ---------------- */

export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[2]) : null;
}

export function setCookie(name: string, value: string, days = 3) {
  if (typeof document === "undefined") return;
  const d = new Date();
  d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${d.toUTCString()}; path=/; SameSite=Lax`;
}

/** Pastikan dapat bucketId (selalu string) dan set ke cookie jika belum ada. */
function getOrCreateBucketId(cookieKey: string): string {
  const existing = getCookie(cookieKey);
  if (existing) return existing;
  const rnd = (globalThis.crypto?.randomUUID?.() as string | undefined) ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  setCookie(cookieKey, rnd);
  return rnd;
}

/* ---------------- Bucket id (pointer via cookie) ---------------- */

/**
 * Pastikan ada bucketId untuk bucketKey tertentu (mis. "add-product" atau `edit:${productId}`).
 * - Pointer id disimpan di cookie
 * - Isi bucket di localStorage diinisialisasi jika belum ada
 */
export function ensureBucketId(bucketKey: string): string {
  if (typeof window === "undefined") return "";
  const cookieKey = `${COOKIE_NAME}:${bucketKey}`;
  const id = getOrCreateBucketId(cookieKey); // <- SELALU string

  // init jika belum ada di localStorage
  const key = LS_PREFIX + id; // <- sekarang pasti string
  if (!localStorage.getItem(key)) {
    const init: BucketData = { files: [], deletes: [] };
    try {
      localStorage.setItem(key, JSON.stringify(init));
    } catch {
      try {
        localStorage.setItem(key, '{"files":[],"deletes":[]}');
      } catch {
        /* ignore */
      }
    }
  }
  return id;
}

/* ---------------- Read/Write storage ---------------- */

function readBucket(id: string): BucketData {
  const raw = localStorage.getItem(LS_PREFIX + id);
  if (!raw) return { files: [], deletes: [] };
  try {
    const parsed = JSON.parse(raw) as BucketData;
    return {
      files: Array.isArray(parsed.files) ? parsed.files : [],
      deletes: Array.isArray(parsed.deletes) ? parsed.deletes : [],
    };
  } catch {
    return { files: [], deletes: [] };
  }
}

function writeBucket(id: string, data: BucketData) {
  const key = LS_PREFIX + id;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e: any) {
    const msg =
      e?.name === "QuotaExceededError" || /quota|storage/i.test(String(e?.message))
        ? "Penyimpanan lokal penuh. Hapus beberapa gambar atau simpan produk terlebih dulu."
        : "Gagal menyimpan media sementara.";
    throw new Error(msg);
  }
}

/* ---------------- Public API: Files (pending upload) ---------------- */

export function listPendingFiles(bucketId: string): PendingFile[] {
  return readBucket(bucketId).files;
}

export function addPendingFiles(bucketId: string, files: PendingFile[]) {
  const b = readBucket(bucketId);
  b.files = [...b.files, ...files];
  writeBucket(bucketId, b);
}

export function removePendingFile(bucketId: string, id: string) {
  const b = readBucket(bucketId);
  b.files = b.files.filter((f) => f.id !== id);
  writeBucket(bucketId, b);
}

/* ---------------- Public API: Deletes (pending delete) ---------------- */

export function listPendingDeletes(bucketId: string): string[] {
  return readBucket(bucketId).deletes;
}

export function addPendingDelete(bucketId: string, publicIdOrUrl: string) {
  const b = readBucket(bucketId);
  if (!b.deletes.includes(publicIdOrUrl)) b.deletes.push(publicIdOrUrl);
  writeBucket(bucketId, b);
}

export function removePendingDelete(bucketId: string, publicIdOrUrl: string) {
  const b = readBucket(bucketId);
  b.deletes = b.deletes.filter((p) => p !== publicIdOrUrl);
  writeBucket(bucketId, b);
}

function deleteCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
}

export function clearBucketByKey(bucketKey: string) {
  const cookieKey = `pf_bucket:${bucketKey}`;
  const id = getCookie(cookieKey);
  if (id) {
    try {
      localStorage.removeItem(`pf:bucket:${id}`);
    } catch {
      /* ignore */
    }
  }
  deleteCookie(cookieKey);
}

/** Bersihkan seluruh bucket (dipanggil setelah submit sukses atau Cancel). */
export function clearAll(bucketId: string) {
  try {
    localStorage.removeItem(LS_PREFIX + bucketId);
  } catch {
    /* ignore */
  }
}

/* ---------------- Utils ---------------- */

/** File → dataURL (untuk preview & simpan sementara). */
export async function fileToDataURL(file: File): Promise<string> {
  return await new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result));
    fr.onerror = () => rej(new Error("Gagal membaca file"));
    fr.readAsDataURL(file);
  });
}

/**
 * Ambil public_id dari Cloudinary secure_url.
 * Contoh:
 *  https://res.cloudinary.com/<cloud>/image/upload/v169999/foo/bar/myimg.jpg
 *  → "foo/bar/myimg"
 */
export function publicIdFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/");
    const uploadIdx = parts.findIndex((p) => p === "upload");
    if (uploadIdx === -1) return null;
    const after = parts.slice(uploadIdx + 1).join("/"); // v123/dir/name.ext
    const noVersion = after.replace(/^v\d+\//, ""); // dir/name.ext
    const dot = noVersion.lastIndexOf(".");
    return dot > 0 ? noVersion.substring(0, dot) : noVersion; // dir/name
  } catch {
    return null;
  }
}
