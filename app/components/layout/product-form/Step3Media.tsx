// app/components/layout/product-form/Step3Media.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ensureBucketId,
  addPendingFiles,
  listPendingFiles,
  removePendingFile,
  addPendingDelete,
  fileToDataURL,
  PendingFile,
} from "@/app/lib/deferredMedia";

export type UploadedMedia = {
  images: string[]; // Cloudinary URLs (existing)
  coverUrl?: string;
  pdfUrl?: string;
  videoUrl?: string;
};

type Props = {
  value: UploadedMedia;
  onChange: (m: UploadedMedia) => void;
  bucketKey?: string; // unik per draft; default: "add-product"
  /** callback untuk memberi tahu parent apakah minimal 1 gambar sudah ada (existing/pending) */
  onValidityChange?: (hasAtLeastOneImage: boolean) => void;
};

const MAX_W = 1000;
const MAX_H = 1000;
const IMG_TYPES = ["image/png", "image/jpeg", "image/jpg"];
const PDF_TYPE = "application/pdf";
const VIDEO_TYPES = ["video/mp4", "video/webm"];
const VIDEO_MAX_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_IMAGES = 3;

function checkImageSize(file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const ok = img.naturalWidth <= MAX_W && img.naturalHeight <= MAX_H;
      URL.revokeObjectURL(url);
      ok ? resolve() : reject(new Error(`Maks resolusi ${MAX_W}x${MAX_H}`));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Gagal membaca gambar"));
    };
    img.src = url;
  });
}

type SlotItem =
  | { kind: "existing"; url: string }
  | { kind: "pending"; id: string; src: string }
  | { kind: "empty" };

export default function Step3Media({
  value,
  onChange,
  bucketKey = "add-product",
  onValidityChange,
}: Props) {
  const [bucketId, setBucketId] = useState<string>("");
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // PREVIEW state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number>(0);

  // refs
  const inputImgRef = useRef<HTMLInputElement>(null);
  const inputImgSingleRef = useRef<HTMLInputElement>(null);
  const inputPdfRef = useRef<HTMLInputElement>(null);
  const inputVideoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = ensureBucketId(bucketKey);
    setBucketId(id);
    setPending(listPendingFiles(id));
  }, [bucketKey]);

  const refreshPending = () => {
    if (!bucketId) return;
    setPending(listPendingFiles(bucketId));
  };

  const existingOrdered = useMemo(() => {
    const imgs = [...value.images];
    if (value.coverUrl && imgs.includes(value.coverUrl)) {
      const i = imgs.indexOf(value.coverUrl);
      imgs.splice(i, 1);
      imgs.unshift(value.coverUrl);
    }
    return imgs;
  }, [value.images, value.coverUrl]);

  const combined: SlotItem[] = useMemo(() => {
    const items: SlotItem[] = [];
    for (const url of existingOrdered) {
      items.push({ kind: "existing", url });
      if (items.length >= MAX_IMAGES) break;
    }
    if (items.length < MAX_IMAGES) {
      for (const p of pending) {
        items.push({ kind: "pending", id: p.id, src: p.dataUrl });
        if (items.length >= MAX_IMAGES) break;
      }
    }
    while (items.length < MAX_IMAGES) items.push({ kind: "empty" });
    return items;
  }, [existingOrdered, pending]);

  // Notifikasi validasi ke parent (≥1 gambar: existing atau pending)
  useEffect(() => {
    const has = existingOrdered.length + pending.length > 0;
    onValidityChange?.(has);
  }, [existingOrdered.length, pending.length, onValidityChange]);

  // Daftar untuk preview
  const previewList = useMemo(() => {
    const arr: string[] = [];
    for (const it of combined) {
      if (it.kind === "existing") arr.push(it.url);
      else if (it.kind === "pending") arr.push(it.src);
    }
    return arr;
  }, [combined]);

  useEffect(() => {
    if (!previewOpen) return;
    if (previewList.length === 0) {
      setPreviewOpen(false);
      return;
    }
    if (previewIndex > previewList.length - 1) {
      setPreviewIndex(previewList.length - 1);
    }
  }, [previewOpen, previewList, previewIndex]);

  useEffect(() => {
    if (!previewOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreviewOpen(false);
      if (e.key === "ArrowRight")
        setPreviewIndex((i) => (i + 1) % previewList.length);
      if (e.key === "ArrowLeft")
        setPreviewIndex(
          (i) => (i - 1 + previewList.length) % previewList.length
        );
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [previewOpen, previewList.length]);

  // MULTI picker
  const onPickImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setErr(null);
    if (files.length === 0 || !bucketId) return;
    try {
      const currentCount = value.images.length + pending.length;
      const remaining = MAX_IMAGES - currentCount;
      if (remaining <= 0) {
        setErr(`Maksimal ${MAX_IMAGES} gambar.`);
        if (inputImgRef.current) inputImgRef.current.value = "";
        return;
      }
      const accepted = files.slice(0, remaining);

      setBusy(true);
      const newPendings: PendingFile[] = [];
      for (const f of accepted) {
        if (!IMG_TYPES.includes(f.type))
          throw new Error("Tipe file harus PNG/JPG/JPEG");
        await checkImageSize(f);
        const dataUrl = await fileToDataURL(f);
        newPendings.push({
          id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
          name: f.name,
          type: f.type,
          size: f.size,
          dataUrl,
        });
      }
      if (accepted.length < files.length) {
        setErr(`Hanya ${remaining} gambar yang diterima (maks ${MAX_IMAGES}).`);
      }
      addPendingFiles(bucketId, newPendings);
      refreshPending();
      if (inputImgRef.current) inputImgRef.current.value = "";
    } catch (e: any) {
      setErr(e?.message || "Gagal menambahkan gambar");
    } finally {
      setBusy(false);
    }
  };

  // Single picker (tetap ada)
  const [slotToFill, setSlotToFill] = useState<number | null>(null);
  const onPickSingleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setErr(null);
    if (!file || !bucketId) return;
    try {
      const currentCount = value.images.length + pending.length;
      const remaining = MAX_IMAGES - currentCount;
      if (remaining <= 0) {
        setErr(`Maksimal ${MAX_IMAGES} gambar.`);
        return;
      }
      if (!IMG_TYPES.includes(file.type))
        throw new Error("Tipe file harus PNG/JPG/JPEG");
      await checkImageSize(file);
      const dataUrl = await fileToDataURL(file);

      const pf: PendingFile = {
        id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
        name: file.name,
        type: file.type,
        size: file.size,
        dataUrl,
      };

      addPendingFiles(bucketId, [pf]);

      if (slotToFill === 0) {
        reorderPendingToFront(pf.id);
        if (value.coverUrl) onChange({ ...value, coverUrl: undefined });
      }
      refreshPending();
    } catch (e: any) {
      setErr(e?.message || "Gagal menambahkan gambar");
    } finally {
      if (inputImgSingleRef.current) inputImgSingleRef.current.value = "";
      setSlotToFill(null);
    }
  };

  const reorderPendingToFront = (id: string) => {
    const current = listPendingFiles(bucketId);
    const idx = current.findIndex((p) => p.id === id);
    if (idx <= 0) return;
    const next = current.slice();
    const [picked] = next.splice(idx, 1);
    next.unshift(picked);
    for (const p of current) removePendingFile(bucketId, p.id);
    addPendingFiles(bucketId, next);
  };

  // drag & drop
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const onDragStart = (i: number) => () => {
    if (combined[i].kind === "empty") return;
    setDragIdx(i);
  };
  const onDragOver = (i: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const onDrop = (i: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === i) return;

    const from = combined[dragIdx];
    const to = combined[i];

    if (from.kind === "existing") {
      reorderExistingBySlots(dragIdx, i);
      if (i === 0) onChange({ ...value, coverUrl: from.url });
    } else if (from.kind === "pending") {
      if (to.kind === "pending") {
        swapPendingBySlots(dragIdx, i);
      } else if (i === 0) {
        reorderPendingToFront(from.id);
        if (value.coverUrl) onChange({ ...value, coverUrl: undefined });
      }
      refreshPending();
    }

    setDragIdx(null);
  };

  const reorderExistingBySlots = (fromIdx: number, toIdx: number) => {
    const currentExisting = existingOrdered.slice();
    const fromItem = combined[fromIdx];
    if (fromItem.kind !== "existing") return;

    const fromPos = currentExisting.indexOf(fromItem.url);
    if (fromPos < 0) return;

    let targetPos = 0;
    for (let k = 0; k < toIdx; k++) {
      if (combined[k].kind === "existing") targetPos++;
    }

    const next = currentExisting.slice();
    next.splice(fromPos, 1);
    next.splice(targetPos, 0, fromItem.url);

    const nextCover = next[0];
    onChange({ ...value, images: next, coverUrl: nextCover });
  };

  const swapPendingBySlots = (aIdx: number, bIdx: number) => {
    const a = combined[aIdx];
    const b = combined[bIdx];
    if (a.kind !== "pending" || b.kind !== "pending") return;

    const current = listPendingFiles(bucketId);
    const ai = current.findIndex((p) => p.id === a.id);
    const bi = current.findIndex((p) => p.id === b.id);
    if (ai < 0 || bi < 0) return;

    const next = current.slice();
    const tmp = next[ai];
    next[ai] = next[bi];
    next[bi] = tmp;

    for (const p of current) removePendingFile(bucketId, p.id);
    addPendingFiles(bucketId, next);
  };

  const removeSlotItem = (i: number) => {
    const it = combined[i];
    if (it.kind === "existing") {
      addPendingDelete(bucketId, it.url);
      const nextImgs = value.images.filter((u) => u !== it.url);
      const nextCover =
        value.coverUrl === it.url ? nextImgs[0] : value.coverUrl;
      onChange({ ...value, images: nextImgs, coverUrl: nextCover });
    } else if (it.kind === "pending") {
      removePendingFile(bucketId, it.id);
      refreshPending();
    }
  };

  // PDF
  const onPickPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setErr(null);
    if (!file) return;
    try {
      if (file.type !== PDF_TYPE) throw new Error("Dokumen harus PDF");
      const dataUrl = await fileToDataURL(file);
      onChange({ ...value, pdfUrl: dataUrl });
      if (inputPdfRef.current) inputPdfRef.current.value = "";
    } catch (e: any) {
      setErr(e?.message || "Gagal memproses dokumen");
    }
  };

  // VIDEO
  const onPickVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setErr(null);
    if (!file) return;
    try {
      if (!VIDEO_TYPES.includes(file.type))
        throw new Error("Video harus MP4 atau WEBM");
      if (file.size > VIDEO_MAX_SIZE) throw new Error("Ukuran video maks 10MB");
      const dataUrl = await fileToDataURL(file);
      onChange({ ...value, videoUrl: dataUrl });
      if (inputVideoRef.current) inputVideoRef.current.value = "";
    } catch (e: any) {
      setErr(e?.message || "Gagal memproses video");
    }
  };

  const slotToPreviewIndex = (slotIndex: number) => {
    let count = 0;
    for (let k = 0; k < combined.length; k++) {
      const it = combined[k];
      if (it.kind === "empty") continue;
      if (k === slotIndex) return count;
      count++;
    }
    return 0;
  };

  // === RENDER SLOT ===
  const renderSlot = (slot: SlotItem, idx: number) => {
    const draggable = slot.kind !== "empty";
    const handleClick = () => {
      if (slot.kind === "empty") {
        inputImgRef.current?.click();
      } else {
        const i = slotToPreviewIndex(idx);
        setPreviewIndex(i);
        setPreviewOpen(true);
      }
    };

    return (
      <div
        key={idx}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
        className={[
          "relative aspect-square w-full overflow-hidden rounded-xl border",
          slot.kind === "empty"
            ? "border-dashed border-gray-300 bg-gray-50"
            : "border-gray-200 bg-white",
          "cursor-pointer",
        ].join(" ")}
        draggable={draggable}
        onDragStart={onDragStart(idx)}
        onDragOver={onDragOver(idx)}
        onDrop={onDrop(idx)}
        onClick={handleClick}
        title={idx === 0 ? "Cover (gambar utama)" : "Gambar"}
      >
        {slot.kind === "empty" ? (
          <div className="absolute inset-0 flex items-center justify-center text-[11px] text-gray-500">
            + Tambah gambar
          </div>
        ) : slot.kind === "existing" ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={slot.url} alt="" className="h-full w-full object-cover" />
            {idx === 0 && (
              <span className="absolute left-1.5 top-1.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
                Cover
              </span>
            )}
            <button
              type="button"
              className="absolute right-1.5 top-1.5 rounded-full bg-white/90 p-1 text-red-600 shadow hover:bg-white"
              onClick={(e) => {
                e.stopPropagation();
                removeSlotItem(idx);
              }}
              title="Hapus"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 7h12M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2m-1 0v12a2 2 0 01-2 2h-4a2 2 0 01-2-2V7h10z"
                />
              </svg>
            </button>
          </>
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={slot.src}
              alt="pending"
              className="h-full w-full object-cover opacity-90"
            />
            {idx === 0 && (
              <span className="absolute left-1.5 top-1.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
                Cover (akan jadi utama)
              </span>
            )}
            <button
              type="button"
              className="absolute right-1.5 top-1.5 rounded-full bg-white/90 p-1 text-red-600 shadow hover:bg-white"
              onClick={(e) => {
                e.stopPropagation();
                removeSlotItem(idx);
              }}
              title="Hapus"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 7h12M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2m-1 0v12a2 2 0 01-2 2h-4a2 2 0 01-2-2V7h10z"
                />
              </svg>
            </button>
          </>
        )}
      </div>
    );
  };

  return (
    <section className="space-y-6">
      {/* IMAGES */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="block text-sm font-medium">
            Upload Foto (PNG/JPG/JPEG, maks {MAX_W}x{MAX_H}, maks {MAX_IMAGES}{" "}
            gambar)
          </label>
        </div>

        {/* GRID slot — gap kecil */}
        <div className="grid grid-cols-3 gap-1">
          {combined.map((slot, i) => renderSlot(slot, i))}
        </div>

        {/* input MULTI tersembunyi */}
        <input
          ref={inputImgRef}
          type="file"
          accept={IMG_TYPES.join(",")}
          multiple
          onChange={onPickImages}
          className="hidden"
        />

        {busy && <p className="mt-1 text-sm text-gray-500">Memproses…</p>}
        {err && <p className="mt-2 text-sm text-red-600">{err}</p>}

        {/* Validasi info */}
        {existingOrdered.length + pending.length === 0 && (
          <p className="mt-2 text-xs text-red-600">
            Minimal unggah 1 gambar untuk melanjutkan.
          </p>
        )}

        {/* input single tetap ada */}
        <input
          ref={inputImgSingleRef}
          type="file"
          accept={IMG_TYPES.join(",")}
          onChange={onPickSingleImage}
          className="hidden"
        />
      </div>

      {/* PDF */}
      <div>
        <label className="block text-sm font-medium">
          Upload Dokumen (PDF)
        </label>
        <input
          ref={inputPdfRef}
          type="file"
          accept={PDF_TYPE}
          onChange={onPickPdf}
          className="mt-2 block w-full text-sm"
        />
        {value.pdfUrl && (
          <div className="mt-2 text-sm">
            Dokumen siap diupload saat menyimpan.
          </div>
        )}
      </div>

      {/* VIDEO */}
      <div>
        <label className="block text-sm font-medium">
          Upload Video (MP4/WEBM, minimal 1, maks 10MB)
        </label>
        <div className="mt-2 flex items-center gap-3">
          <input
            ref={inputVideoRef}
            type="file"
            accept={VIDEO_TYPES.join(",")}
            onChange={onPickVideo}
            className="block w-full text-sm"
          />
        </div>
        {value.videoUrl ? (
          <div className="mt-3 overflow-hidden rounded-xl border">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              src={value.videoUrl}
              controls
              className="h-40 w-full object-contain"
            />
            <div className="flex items-center justify-end p-2">
              <button
                type="button"
                onClick={() => onChange({ ...value, videoUrl: undefined })}
                className="text-sm text-red-600"
              >
                Hapus Video
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-xs text-gray-500">
            Belum ada video. Unggah minimal 1 video agar produk lebih menarik.
            (Batas 10MB)
          </p>
        )}
      </div>

      {/* PREVIEW MODAL (multi) */}
      {previewOpen && previewList.length > 0 && (
        <div className="fixed inset-0 z-[1000]">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setPreviewOpen(false)}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="relative max-h-[90vh] w-[90vw] max-w-4xl overflow-hidden rounded-xl bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewList[previewIndex]}
                alt={`preview-${previewIndex + 1}`}
                className="max-h-[85vh] w-full object-contain"
              />

              {/* Close */}
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="absolute right-2 top-2 rounded-full bg-black/70 p-2 text-white hover:bg-black"
                aria-label="Tutup preview"
                title="Tutup (Esc)"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>

              {/* Nav Left */}
              {previewList.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewIndex(
                      (i) => (i - 1 + previewList.length) % previewList.length
                    );
                  }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/70 p-2 text-white hover:bg-black"
                  aria-label="Sebelumnya"
                  title="Sebelumnya (←)"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
              )}

              {/* Nav Right */}
              {previewList.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewIndex((i) => (i + 1) % previewList.length);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/70 p-2 text-white hover:bg-black"
                  aria-label="Berikutnya"
                  title="Berikutnya (→)"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              )}

              {/* Indicator */}
              {previewList.length > 1 && (
                <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
                  {previewIndex + 1} / {previewList.length}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
