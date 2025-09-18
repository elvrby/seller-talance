"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/libs/firebase/config";
import { useAuthGuard } from "@/app/hooks/use-auth-guard";

import Step1Basic, { ServiceType } from "@/app/components/layout/product-form/Step1Basic";
import Step2Tiers, { TierForm } from "@/app/components/layout/product-form/Step2Tiers";
import Step3Media, { UploadedMedia } from "@/app/components/layout/product-form/Step3Media";
import Step4Customize from "@/app/components/layout/product-form/Step4Customize";

import { ensureBucketId, listPendingFiles, listPendingDeletes, clearAll, clearBucketByKey, publicIdFromUrl, isString } from "@/app/lib/deferredMedia";

// ---------- Cloudinary helpers ----------
async function signUpload(folder: string, publicId?: string, resourceType: "image" | "raw" = "image") {
  const res = await fetch("/api/cloudinary/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder, resourceType, publicId }),
  });
  if (!res.ok) throw new Error("Gagal membuat signature upload");
  return (await res.json()) as {
    timestamp: number;
    folder: string;
    signature: string;
    apiKey: string;
    cloudName: string;
  };
}

async function uploadDataUrlToCloudinary(dataUrl: string, filename: string, folder: string, resourceType: "image" | "raw" = "image") {
  const publicId = filename.replace(/\.[^.]+$/, "");
  const { timestamp, signature, apiKey, cloudName } = await signUpload(folder, publicId, resourceType);
  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

  const form = new FormData();
  form.append("file", dataUrl);
  form.append("api_key", apiKey);
  form.append("timestamp", String(timestamp));
  form.append("signature", signature);
  form.append("folder", folder);
  form.append("public_id", publicId);

  const resp = await fetch(endpoint, { method: "POST", body: form });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    console.error("[cloudinary] upload error:", resp.status, text);
    throw new Error("Upload ke Cloudinary gagal");
  }
  return await resp.json(); // { secure_url, public_id, ... }
}

// ---------- Types & mapping ----------
type Draft = {
  title: string;
  serviceType: ServiceType | null;
  subServices: string[];
  tiers: Record<"basic" | "standard" | "premium", TierForm>;
  media: UploadedMedia & { publicIds?: string[] };
  qaTemplate: string;
  status: "draft" | "published";
  ownerId?: string;
};

const emptyTier: TierForm = {
  description: "",
  deliveryDays: 1,
  revisions: 1,
  price: 15000,
  specials: {},
};

const toDraft = (raw: any): Draft => {
  const tiers = raw?.tiers ?? {};
  const ensureTier = (t: any): TierForm => ({
    description: String(t?.description ?? ""),
    deliveryDays: Number(t?.deliveryDays ?? 1),
    revisions: Number(t?.revisions ?? 1),
    price: Number(t?.price ?? 15000),
    specials: typeof t?.specials === "object" && t?.specials !== null ? t.specials : {},
  });

  const images = Array.isArray(raw?.media?.images) ? (raw.media.images.filter(Boolean) as string[]) : [];
  const publicIds = Array.isArray(raw?.media?.publicIds) ? (raw.media.publicIds.filter(Boolean) as string[]) : undefined;

  const media: Draft["media"] = {
    images,
    ...(raw?.media?.coverUrl ? { coverUrl: raw.media.coverUrl } : {}),
    ...(raw?.media?.pdfUrl ? { pdfUrl: raw.media.pdfUrl } : {}),
    ...(publicIds ? { publicIds } : {}),
  };

  return {
    title: String(raw?.title ?? ""),
    serviceType: (raw?.serviceType as ServiceType) ?? null,
    subServices: Array.isArray(raw?.subServices) ? (raw.subServices.filter(Boolean) as string[]) : [],
    tiers: {
      basic: ensureTier(tiers.basic),
      standard: ensureTier(tiers.standard),
      premium: ensureTier(tiers.premium),
    },
    media,
    qaTemplate: String(raw?.qaTemplate ?? "Halo! Terima kasih sudah menghubungi saya 👋 Ada yang bisa saya bantu?"),
    status: raw?.status === "published" ? "published" : "draft",
    ownerId: raw?.ownerId,
  };
};

// ---------- Page ----------
export default function EditProductPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const productId = params?.id;

  const { user, checking } = useAuthGuard("/account/sign-in", {
    enforceVerified: true,
    enforceFreelanceComplete: true,
  });

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Draft>({
    title: "",
    serviceType: null,
    subServices: [],
    tiers: { basic: { ...emptyTier }, standard: { ...emptyTier }, premium: { ...emptyTier } },
    media: { images: [] },
    qaTemplate: "Halo! Terima kasih sudah menghubungi saya 👋 Ada yang bisa saya bantu?",
    status: "draft",
  });

  // Bucket unik per sesi edit
  const BUCKET_KEY = useMemo(() => {
    const base = isString(productId) ? `edit:${productId}` : "edit:pending";
    const nonce = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return `${base}:${nonce}`;
  }, [productId]);

  useEffect(() => {
    if (!user || !productId) return;
    (async () => {
      try {
        const ref = doc(db, "users", user.uid, "products", productId);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        const data = snap.data();
        const d = toDraft(data);
        // path memastikan kepemilikan, tambahan check opsional:
        if (d.ownerId && d.ownerId !== user.uid) {
          setForbidden(true);
          setLoading(false);
          return;
        }
        setDraft(d);
        setLoading(false);
      } catch (e) {
        console.error("[edit-product] load error:", e);
        setNotFound(true);
        setLoading(false);
      }
    })();
  }, [user, productId]);

  const canNext1 = useMemo(() => {
    return draft.title.trim().length >= 3 && draft.serviceType !== null && draft.subServices.length > 0 && draft.subServices.length <= 3;
  }, [draft.title, draft.serviceType, draft.subServices]);

  const canNext2 = useMemo(() => {
    const validTier = (t: TierForm) =>
      t.description.trim().length > 0 && t.description.trim().length <= 2000 && t.deliveryDays >= 1 && t.deliveryDays <= 10 && t.revisions >= 0 && t.revisions <= 10 && t.price >= 15000;
    return validTier(draft.tiers.basic);
  }, [draft.tiers]);

  const canNext3 = true;

  // Back (ikon)
  const goBack = () => {
    if (step > 1) {
      setStep((s) => (s - 1) as any);
    } else {
      // step-1 → dianggap cancel
      const id = ensureBucketId(BUCKET_KEY);
      clearAll(id);
      clearBucketByKey(BUCKET_KEY);
      router.replace("/product");
    }
  };

  // Cancel (footer)
  const cancelEdit = () => {
    const id = ensureBucketId(BUCKET_KEY);
    clearAll(id);
    clearBucketByKey(BUCKET_KEY);
    router.replace("/product");
  };

  const onSave = async () => {
    if (!user || !productId) return;
    setSaving(true);
    try {
      const bucketId = ensureBucketId(BUCKET_KEY);

      // 1) Upload pending images baru
      const pendings = listPendingFiles(bucketId);
      const uploadedUrls: string[] = [];
      const uploadedPublicIds: string[] = [];
      for (const pf of pendings) {
        const r = await uploadDataUrlToCloudinary(pf.dataUrl, pf.name, "products/images", "image");
        uploadedUrls.push(r.secure_url);
        uploadedPublicIds.push(r.public_id);
      }

      // (opsional) PDF baru (dataURL) → upload raw
      let pdfUrlFinal = draft.media.pdfUrl;
      if (pdfUrlFinal && pdfUrlFinal.startsWith("data:application/pdf")) {
        const r = await uploadDataUrlToCloudinary(pdfUrlFinal, "document.pdf", "products/docs", "raw");
        pdfUrlFinal = r.secure_url;
      }

      // 2) Gabungkan existing + uploaded
      const existingUrls = draft.media.images; // sisa yang dipertahankan
      const finalUrls = Array.from(new Set([...existingUrls, ...uploadedUrls]));

      // publicIds: gunakan yang ada, kalau tidak ada derive dari url
      const existingPublicIds: string[] =
        Array.isArray(draft.media.publicIds) && draft.media.publicIds.length ? draft.media.publicIds.slice() : existingUrls.map((u) => publicIdFromUrl(u)).filter(isString);

      const finalPublicIds = Array.from(new Set([...existingPublicIds, ...uploadedPublicIds]));

      // cover
      const coverUrlTop = draft.media.coverUrl ?? (finalUrls[0] || undefined);

      const mediaPayload: any = {
        images: finalUrls,
        publicIds: finalPublicIds,
      };
      if (isString(coverUrlTop)) mediaPayload.coverUrl = coverUrlTop;
      if (pdfUrlFinal) mediaPayload.pdfUrl = pdfUrlFinal;

      // 3) Update Firestore pada path users/{uid}/products/{productId}
      const payload: any = {
        title: draft.title.trim(),
        serviceType: draft.serviceType,
        subServices: draft.subServices,
        tiers: draft.tiers,
        media: mediaPayload,
        qaTemplate: draft.qaTemplate || "",
        status: draft.status || "draft",
        coverUrl: coverUrlTop ?? null,
        updatedAt: serverTimestamp(),
      };

      await updateDoc(doc(db, "users", user.uid, "products", productId), payload);

      // (opsional) pending delete → hapus di Cloudinary via endpoint admin kamu
      const rawDeletes = listPendingDeletes(bucketId);
      const publicIdsToDelete: string[] = rawDeletes.map((x) => publicIdFromUrl(x) ?? x).filter(isString);

      if (publicIdsToDelete.length > 0) {
        await fetch("/api/cloudinary/admin/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publicIds: publicIdsToDelete }),
        }).catch((e) => console.warn("[cloudinary] delete error:", e));
      }

      // 4) Clear bucket & pointer
      clearAll(bucketId);
      clearBucketByKey(BUCKET_KEY);

      router.replace("/product");
    } catch (e: any) {
      console.error("[edit-product] save error:", e?.code, e?.message, e);
      if (e?.code === "permission-denied") {
        alert("Tidak punya izin mengedit produk ini.");
      } else if (e?.message?.includes("Unsupported field value: undefined")) {
        alert("Ada field bernilai undefined. Pastikan semua input terisi.");
      } else if (e?.message?.includes("Upload ke Cloudinary gagal")) {
        alert("Gagal upload media ke Cloudinary. Cek konfigurasi /api/cloudinary/sign & env.");
      } else {
        alert("Gagal menyimpan produk, coba lagi.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (checking || !user || loading) {
    return <main className="grid min-h-[calc(100vh-64px)] place-items-center text-sm text-gray-500">Memuat…</main>;
  }
  if (notFound) {
    return <main className="grid min-h-[calc(100vh-64px)] place-items-center text-sm text-gray-500">Produk tidak ditemukan.</main>;
  }
  if (forbidden) {
    return <main className="grid min-h-[calc(100vh-64px)] place-items-center text-sm text-gray-500">Kamu tidak memiliki akses untuk mengedit produk ini.</main>;
  }

  return (
    <main className="mx-auto max-w-3xl p-4">
      {/* Header: Back icon + Judul + Step */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button aria-label="Kembali" onClick={goBack} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 hover:bg-gray-100" title="Kembali">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-semibold">Edit Produk/Jasa</h1>
        </div>
        <div className="text-sm text-gray-500">Langkah {step} dari 4</div>
      </div>

      {/* Steps */}
      {step === 1 && <Step1Basic value={{ title: draft.title, serviceType: draft.serviceType, subServices: draft.subServices }} onChange={(next) => setDraft((d) => ({ ...d, ...next }))} />}
      {step === 2 && <Step2Tiers serviceType={draft.serviceType} value={draft.tiers} onChange={(tiers) => setDraft((d) => ({ ...d, tiers }))} />}
      {step === 3 && (
        <Step3Media
          value={draft.media}
          onChange={(media) => setDraft((d) => ({ ...d, media }))}
          bucketKey={BUCKET_KEY} // unik per sesi edit
        />
      )}
      {step === 4 && <Step4Customize qaTemplate={draft.qaTemplate} status={draft.status} onChange={(payload) => setDraft((d) => ({ ...d, ...payload }))} />}

      {/* Footer actions */}
      <div className="mt-6 flex items-center justify-end gap-2">
        <button type="button" onClick={cancelEdit} className="rounded-xl border border-red-600 px-4 py-2 text-red-700 hover:bg-red-100">
          Cancel
        </button>

        {step < 4 ? (
          <button
            type="button"
            disabled={(step === 1 && !canNext1) || (step === 2 && !canNext2) || (step === 3 && !canNext3)}
            onClick={() => setStep((s) => (s + 1) as any)}
            className="rounded-xl bg-gray-900 px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-50"
          >
            Lanjut
          </button>
        ) : (
          <button type="button" disabled={saving} onClick={onSave} className="rounded-xl bg-gray-900 px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-50">
            {saving ? "Menyimpan…" : "Simpan Perubahan"}
          </button>
        )}
      </div>
    </main>
  );
}
