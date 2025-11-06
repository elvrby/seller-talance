// app/product/add-product/page.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "@/libs/firebase/config";
import { useAuthGuard } from "@/app/hooks/use-auth-guard";

import Step1Basic, {
  ServiceType,
} from "@/app/components/layout/product-form/Step1Basic";
import Step2Tiers, {
  TierForm,
} from "@/app/components/layout/product-form/Step2Tiers";
import Step3Media, {
  UploadedMedia,
} from "@/app/components/layout/product-form/Step3Media";
import Step4Customize from "@/app/components/layout/product-form/Step4Customize";

import {
  ensureBucketId,
  listPendingFiles,
  clearAll,
  clearBucketByKey,
} from "@/app/lib/deferredMedia";

// ================== Tipe & Draft ==================
type Draft = {
  title: string;
  serviceType: ServiceType | null;
  subServices: string[];
  tiers: Record<"basic" | "standard" | "premium", TierForm>;
  media: UploadedMedia; // { images: string[]; coverUrl?: string; pdfUrl?: string (dataURL sementara) }
  qaTemplate: string;
  status: "draft" | "published";
};

const emptyTier: TierForm = {
  description: "",
  deliveryDays: 1,
  revisions: 1,
  price: 15000,
  specials: {},
};

const initialDraft: Draft = {
  title: "",
  serviceType: null,
  subServices: [],
  tiers: {
    basic: { ...emptyTier },
    standard: { ...emptyTier },
    premium: { ...emptyTier },
  },
  media: { images: [] },
  qaTemplate:
    "Halo! Terima kasih sudah menghubungi saya 👋 Ada yang bisa saya bantu?",
  status: "draft",
};

// ================== Cloudinary helpers ==================
async function signUpload(
  folder: string,
  publicId?: string,
  resourceType: "image" | "raw" = "image"
) {
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

async function uploadDataUrlToCloudinary(
  dataUrl: string,
  filename: string,
  folder: string,
  resourceType: "image" | "raw" = "image"
) {
  const publicId = filename.replace(/\.[^.]+$/, "");
  const { timestamp, signature, apiKey, cloudName } = await signUpload(
    folder,
    publicId,
    resourceType
  );

  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
  const form = new FormData();
  form.append("file", dataUrl);
  form.append("api_key", apiKey);
  form.append("timestamp", String(timestamp));
  form.append("signature", signature);
  form.append("folder", folder);
  form.append("public_id", publicId); // harus sama dengan yang disign

  const resp = await fetch(endpoint, { method: "POST", body: form });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    console.error("[cloudinary] upload error:", resp.status, text);
    throw new Error("Upload ke Cloudinary gagal");
  }
  return await resp.json(); // { secure_url, public_id, ... }
}

// ================== Step Bar (compact & responsive) ==================
type StepMeta = {
  id: 1 | 2 | 3 | 4;
  label: string;
  enabled: boolean;
  done: boolean;
  active: boolean;
};

function StepBar({
  steps,
  onSelect,
}: {
  steps: StepMeta[];
  onSelect: (id: 1 | 2 | 3 | 4) => void;
}) {
  return (
    <div className="flex w-full gap-2 overflow-x-auto no-scrollbar py-1">
      {steps.map((s, idx) => {
        const base =
          "flex-shrink-0 flex items-center relative overflow-hidden rounded-full px-3 py-1.5 text-[12px] sm:text-sm transition";
        const activeCls = s.active
          ? "bg-gray-900 text-white"
          : s.enabled
          ? "bg-gray-200 text-gray-800 hover:bg-gray-300"
          : "bg-gray-100 text-gray-400 cursor-not-allowed";
        return (
          <button
            key={s.id}
            type="button"
            aria-current={s.active ? "step" : undefined}
            aria-disabled={!s.enabled}
            title={s.label}
            onClick={() => s.enabled && onSelect(s.id)}
            className={`${base} ${activeCls}`}
            style={{ minWidth: "90px" }}
          >
            <span className="mr-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full border text-[10px] sm:text-xs">
              {idx + 1}
            </span>
            <span className="truncate">{s.label}</span>
            {s.done && !s.active && (
              <span className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-gray-700/60" />
            )}
          </button>
        );
      })}
    </div>
  );
}

/* Tambahkan di global.css (opsional, untuk sembunyikan scrollbar)
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
*/

// ================== Page ==================
export default function AddProductPage() {
  const router = useRouter();
  // Guard: harus login, verified, dan form freelancer sudah lengkap
  const { user, checking } = useAuthGuard("/account/sign-in", {
    enforceVerified: true,
    enforceFreelanceComplete: true,
  });

  // ✅ inside AddProductPage() body
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [hasAtLeastOneImage, setHasAtLeastOneImage] = useState(false); // <-- this too

  // BUCKET KEY unik per sesi tambah-produk
  const BUCKET_KEY = useMemo(
    () =>
      `add-product:${
        globalThis.crypto?.randomUUID?.() ??
        `${Date.now()}-${Math.random().toString(36).slice(2)}`
      }`,
    []
  );

  // Validasi step
  const canNext1 = useMemo(() => {
    return (
      draft.title.trim().length >= 3 &&
      draft.serviceType !== null &&
      draft.subServices.length > 0 &&
      draft.subServices.length <= 3
    );
  }, [draft.title, draft.serviceType, draft.subServices]);

  const canNext2 = useMemo(() => {
    const validTier = (t: TierForm) =>
      t.description.trim().length > 0 &&
      t.description.trim().length <= 2000 &&
      t.deliveryDays >= 1 &&
      t.deliveryDays <= 10 &&
      t.revisions >= 0 &&
      t.revisions <= 10 &&
      t.price >= 15000;
    return validTier(draft.tiers.basic);
  }, [draft.tiers]);

  const canNext3 = hasAtLeastOneImage; // sebelumnya: true

  // matrix enable untuk klik step bar (gated)
  const enabledMatrix = useMemo(
    () => [
      true,
      canNext1,
      canNext1 && canNext2,
      canNext1 && canNext2 && canNext3,
    ],
    [canNext1, canNext2, canNext3]
  );

  const stepItems: StepMeta[] = useMemo(() => {
    const labels = ["Dasar", "Paket", "Media", "Kustom"];
    return labels.map((label, idx) => {
      const id = (idx + 1) as 1 | 2 | 3 | 4;
      return {
        id,
        label,
        enabled: enabledMatrix[idx] || step >= id, // boleh klik mundur kapan saja; maju harus lolos validasi
        done: step > id,
        active: step === id,
      };
    });
  }, [enabledMatrix, step]);

  // Back (ikon)
  const goBackStep = () => {
    if (step > 1) {
      setStep((s) => (s - 1) as any);
    } else {
      // di step-1: back dianggap cancel — bersihkan bucket
      const id = ensureBucketId(BUCKET_KEY);
      clearAll(id);
      clearBucketByKey(BUCKET_KEY);
      router.replace("/product");
    }
  };

  // Cancel (footer)
  const cancelCreate = () => {
    const id = ensureBucketId(BUCKET_KEY);
    clearAll(id);
    clearBucketByKey(BUCKET_KEY);
    router.replace("/product");
  };

  const onSubmit = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const bucketId = ensureBucketId(BUCKET_KEY);

      // 1) Upload semua pending images
      const pendings = listPendingFiles(bucketId);
      const uploadedUrls: string[] = [];
      const uploadedPublicIds: string[] = [];

      for (const pf of pendings) {
        const r = await uploadDataUrlToCloudinary(
          pf.dataUrl,
          pf.name,
          "products/images",
          "image"
        );
        uploadedUrls.push(r.secure_url);
        uploadedPublicIds.push(r.public_id);
      }

      // 2) (opsional) upload PDF jika draft.media.pdfUrl berupa dataURL
      let uploadedPdfUrl: string | undefined;
      if (
        draft.media.pdfUrl &&
        draft.media.pdfUrl.startsWith("data:application/pdf")
      ) {
        const r = await uploadDataUrlToCloudinary(
          draft.media.pdfUrl,
          "document.pdf",
          "products/docs",
          "raw"
        );
        uploadedPdfUrl = r.secure_url;
      }

      // 3) Susun media final
      const allUrls = [...uploadedUrls]; // add-mode: tidak ada existing dari value.images
      const mediaPayload: any = {
        images: allUrls,
        publicIds: uploadedPublicIds,
      };
      if (uploadedPdfUrl) mediaPayload.pdfUrl = uploadedPdfUrl;

      // pilih cover (pakai cover dari draft kalau ada, kalau tidak pakai gambar pertama)
      const coverUrlTop = draft.media.coverUrl ?? allUrls[0];
      if (coverUrlTop) mediaPayload.coverUrl = coverUrlTop;

      // 4) Payload Firestore (subkoleksi user)
      const payload: any = {
        ownerId: user.uid,
        title: draft.title.trim(),
        serviceType: draft.serviceType,
        subServices: draft.subServices,
        tiers: draft.tiers,
        media: mediaPayload,
        qaTemplate: draft.qaTemplate || "",
        status: draft.status || "draft",
        coverUrl: coverUrlTop ?? null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // 5) Simpan ke users/{uid}/products
      const colRef = collection(db, "users", user.uid, "products");
      const ref = await addDoc(colRef, payload);

      // Simpan productId sebagai field juga (memudahkan query/marketplace)
      await setDoc(
        doc(db, "users", user.uid, "products", ref.id),
        { productId: ref.id },
        { merge: true }
      );

      // 6) Beres → kosongkan bucket & pointer
      clearAll(bucketId);
      clearBucketByKey(BUCKET_KEY);

      router.replace("/product");
    } catch (e: any) {
      console.error("[add-product] save error:", e?.code, e?.message, e);
      if (e?.code === "permission-denied") {
        alert(
          "Tidak punya izin menulis ke Firestore. Cek rules users/{uid}/products."
        );
      } else if (e?.message?.includes("Unsupported field value: undefined")) {
        alert("Ada field bernilai undefined. Pastikan semua input terisi.");
      } else if (e?.message?.includes("Upload ke Cloudinary gagal")) {
        alert(
          "Gagal upload media ke Cloudinary. Cek konfigurasi /api/cloudinary/sign & env."
        );
      } else {
        alert("Gagal menyimpan produk, coba lagi.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (checking || !user) {
    return (
      <main className="grid min-h-[calc(100vh-64px)] place-items-center text-sm text-gray-500">
        Memuat…
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-4">
      {/* Header: Back icon + Judul + Step Bar */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            aria-label="Kembali"
            onClick={goBackStep}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 hover:bg-gray-100"
            title="Kembali"
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h1 className="text-2xl font-semibold">Tambahkan Produk/Jasa</h1>
        </div>

        {/* Step Bar (klik untuk lompat step, tapi gated) */}
        <div className="w-full sm:w-[55%]">
          <StepBar
            steps={stepItems}
            onSelect={(id) => {
              const idx = id - 1;
              if (stepItems[idx].enabled) setStep(id);
            }}
          />
        </div>
      </div>

      {/* STEP 1 */}
      {step === 1 && (
        <Step1Basic
          value={{
            title: draft.title,
            serviceType: draft.serviceType,
            subServices: draft.subServices,
          }}
          onChange={(next) => setDraft((d) => ({ ...d, ...next }))}
        />
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <Step2Tiers
          serviceType={draft.serviceType}
          value={draft.tiers}
          onChange={(tiers) => setDraft((d) => ({ ...d, tiers }))}
        />
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <Step3Media
          value={draft.media}
          onChange={(media) => setDraft((d) => ({ ...d, media }))}
          bucketKey={BUCKET_KEY}
          onValidityChange={setHasAtLeastOneImage} // <-- penting
        />
      )}

      {/* STEP 4 */}
      {step === 4 && (
        <Step4Customize
          qaTemplate={draft.qaTemplate}
          status={draft.status}
          onChange={(payload) => setDraft((d) => ({ ...d, ...payload }))}
        />
      )}

      {/* Footer actions */}
      <div className="mt-6 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={cancelCreate}
          className="rounded-xl border border-red-600 px-4 py-2 text-red-700 hover:bg-red-100"
        >
          Cancel
        </button>

        {step < 4 ? (
          <button
            type="button"
            disabled={
              (step === 1 && !canNext1) ||
              (step === 2 && !canNext2) ||
              (step === 3 && !canNext3)
            }
            onClick={() => setStep((s) => (s + 1) as any)}
            className="rounded-xl bg-gray-900 px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-50"
          >
            Lanjut
          </button>
        ) : (
          <button
            type="button"
            disabled={saving}
            onClick={onSubmit}
            className="rounded-xl bg-gray-900 px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {saving ? "Menyimpan…" : "Simpan Produk"}
          </button>
        )}
      </div>
    </main>
  );
}
