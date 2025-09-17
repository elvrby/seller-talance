// app/components/layout/product-form/Step3Media.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { ensureBucketId, addPendingFiles, listPendingFiles, removePendingFile, addPendingDelete, fileToDataURL, PendingFile } from "@/app/lib/deferredMedia";

export type UploadedMedia = {
  images: string[]; // Cloudinary URLs (existing)
  coverUrl?: string; // optional cover
  pdfUrl?: string; // optional PDF (tetap boleh diupload langsung saat submit)
};

type Props = {
  value: UploadedMedia;
  onChange: (m: UploadedMedia) => void;
  bucketKey?: string; // unik per draft; default: "add-product"
};

const MAX_W = 1000;
const MAX_H = 1000;
const IMG_TYPES = ["image/png", "image/jpeg", "image/jpg"];
const PDF_TYPE = "application/pdf";

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

export default function Step3Media({ value, onChange, bucketKey = "add-product" }: Props) {
  const [bucketId, setBucketId] = useState<string>("");
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputImgRef = useRef<HTMLInputElement>(null);
  const inputPdfRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = ensureBucketId(bucketKey);
    setBucketId(id);
    setPending(listPendingFiles(id));
  }, [bucketKey]);

  const refreshPending = () => {
    if (!bucketId) return;
    setPending(listPendingFiles(bucketId));
  };

  const onPickImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setErr(null);
    if (files.length === 0 || !bucketId) return;
    try {
      setBusy(true);
      const newPendings: PendingFile[] = [];
      for (const f of files) {
        if (!IMG_TYPES.includes(f.type)) throw new Error("Tipe file harus PNG/JPG/JPEG");
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
      addPendingFiles(bucketId, newPendings);
      refreshPending();
      if (inputImgRef.current) inputImgRef.current.value = "";
    } catch (e: any) {
      setErr(e?.message || "Gagal menambahkan gambar");
    } finally {
      setBusy(false);
    }
  };

  const removePendingLocal = (id: string) => {
    if (!bucketId) return;
    removePendingFile(bucketId, id);
    refreshPending();
  };

  const onPickPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setErr(null);
    if (!file) return;
    try {
      if (file.type !== PDF_TYPE) throw new Error("Dokumen harus PDF");
      // PDF juga ditunda? Kita boleh langsung simpan dataUrl sementara
      const dataUrl = await fileToDataURL(file);
      // Sederhana: simpan sementara di state value.pdfUrl sebagai dataUrl (akan diupload saat submit)
      onChange({ ...value, pdfUrl: dataUrl });
      if (inputPdfRef.current) inputPdfRef.current.value = "";
    } catch (e: any) {
      setErr(e?.message || "Gagal memproses dokumen");
    }
  };

  const markDeleteExisting = (url: string) => {
    // di tahap ini kita belum hapus di Cloudinary — hanya tandai
    // di parent: keluarkan dari UI
    onChange({
      ...value,
      images: value.images.filter((x) => x !== url),
      coverUrl: value.coverUrl === url ? value.images.find((x) => x !== url) : value.coverUrl,
    });
    // public_id akan dihitung saat submit di server atau di client
    // di sini cukup tandai; actual penentuan public_id bisa saat submit
    // (opsional: kita bisa cari public_id dari url di sini juga)
    // kita tandai dengan url — public_id akan diekstrak saat submit
    addPendingDelete(bucketId, url); // sementara isi dengan url; akan dikonversi ke public_id di submit
  };

  return (
    <section className="space-y-6">
      <div>
        <label className="block text-sm font-medium">
          Upload Foto (PNG/JPG/JPEG, maks {MAX_W}x{MAX_H})
        </label>
        <input ref={inputImgRef} type="file" accept={IMG_TYPES.join(",")} multiple onChange={onPickImages} className="mt-2 block w-full text-sm" />
        {err && <p className="mt-1 text-sm text-red-600">{err}</p>}
        {busy && <p className="mt-1 text-sm text-gray-500">Memproses…</p>}

        {/* Pending previews */}
        {pending.length > 0 && (
          <>
            <div className="mt-3 text-xs font-medium text-gray-700">Akan diupload saat menyimpan:</div>
            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {pending.map((p) => (
                <div key={p.id} className="overflow-hidden rounded-xl border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.dataUrl} alt={p.name} className="h-32 w-full object-cover" />
                  <div className="flex items-center justify-between p-2">
                    <span className="truncate text-xs text-gray-600" title={p.name}>
                      {p.name}
                    </span>
                    <button type="button" onClick={() => removePendingLocal(p.id)} className="text-xs text-red-600">
                      Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Existing cloud images */}
        {value.images.length > 0 && (
          <>
            <div className="mt-4 text-xs font-medium text-gray-700">Gambar saat ini:</div>
            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {value.images.map((u) => (
                <div key={u} className="overflow-hidden rounded-xl border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u} alt="" className="h-32 w-full object-cover" />
                  <div className="flex items-center justify-between p-2">
                    <button type="button" onClick={() => onChange({ ...value, coverUrl: u })} className={`text-xs ${value.coverUrl === u ? "text-emerald-600" : "text-gray-600"}`}>
                      {value.coverUrl === u ? "Cover" : "Jadikan Cover"}
                    </button>
                    <button type="button" onClick={() => markDeleteExisting(u)} className="text-xs text-red-600">
                      Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium">Upload Dokumen (PDF)</label>
        <input ref={inputPdfRef} type="file" accept={PDF_TYPE} onChange={onPickPdf} className="mt-2 block w-full text-sm" />
        {value.pdfUrl && <div className="mt-2 text-sm">Dokumen (akan diupload saat menyimpan)</div>}
      </div>
    </section>
  );
}
