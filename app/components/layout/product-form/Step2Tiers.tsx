// app/components/layout/product-form/Step2Tiers.tsx
"use client";

import { useEffect, useMemo } from "react";
import type { ServiceType } from "./Step1Basic";

export type TierForm = {
  description: string; // <= 400 chars
  deliveryDays: number; // 1..10
  revisions: number; // 0..10 (0=none), gunakan 99 utk unlimited jika mau
  price: number; // >= 15000
  specials: Record<string, boolean>; // dynamic keys, ex: sourceCode, seoOptimization
};

type Props = {
  serviceType: ServiceType | null;
  value: Record<"basic" | "standard" | "premium", TierForm>;
  onChange: (tiers: Props["value"]) => void;
};

// Specials per service type
const SPECIALS_BY_TYPE: Record<ServiceType, Array<{ key: string; label: string }>> = {
  Web: [
    { key: "sourceCode", label: "Source code" },
    { key: "seoOptimization", label: "SEO optimization" },
  ],
  Editing: [
    { key: "rawFiles", label: "Raw files" },
    { key: "colorGrading", label: "Color grading" },
  ],
  Writing: [
    { key: "seoKeywords", label: "SEO keywords" },
    { key: "plagiarismReport", label: "Plagiarism report" },
  ],
  Programming: [
    { key: "unitTests", label: "Unit tests" },
    { key: "apiDocs", label: "API documentation" },
  ],
};

const TIERS: Array<keyof Props["value"]> = ["basic", "standard", "premium"];

export default function Step2Tiers({ serviceType, value, onChange }: Props) {
  const specials = useMemo(() => {
    if (!serviceType) return [];
    return SPECIALS_BY_TYPE[serviceType] || [];
  }, [serviceType]);

  // Pastikan kunci specials tersedia/di-reset saat ganti kategori
  useEffect(() => {
    if (!serviceType) return;
    const keys = specials.map((s) => s.key);
    const next = { ...value };
    for (const t of TIERS) {
      const cur = next[t];
      const newMap: Record<string, boolean> = {};
      keys.forEach((k) => (newMap[k] = Boolean(cur.specials?.[k])));
      next[t] = { ...cur, specials: newMap };
    }
    onChange(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceType]);

  const update = (tier: keyof Props["value"], patch: Partial<TierForm>) => {
    onChange({ ...value, [tier]: { ...value[tier], ...patch } });
  };

  return (
    <section className="space-y-6">
      {!serviceType && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-800 text-sm">
          Pilih tipe jasa dulu di langkah 1 agar opsi <b>Special</b> muncul sesuai kategori.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {TIERS.map((t) => {
          const v = value[t];
          return (
            <div key={t} className="rounded-xl border border-gray-200 p-3">
              <div className="mb-2 text-sm font-semibold capitalize">{t}</div>

              <div className="space-y-3">
                {/* Deskripsi */}
                <div>
                  <label className="block text-xs font-medium">Deskripsi (≤ 400 kata)</label>
                  <textarea
                    value={v.description}
                    onChange={(e) => update(t, { description: e.target.value })}
                    className="mt-1 h-24 w-full resize-none rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-gray-900"
                    maxLength={2000} // batasan kasar; validasi “≤ 400 kata” akan di server/submit
                    placeholder="Ceritakan apa yang didapat pembeli di tier ini…"
                  />
                </div>

                {/* Waktu */}
                <div>
                  <label className="block text-xs font-medium">Waktu Pengerjaan</label>
                  <select
                    value={v.deliveryDays}
                    onChange={(e) => update(t, { deliveryDays: Number(e.target.value) })}
                    className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-gray-900"
                  >
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        {d} hari
                      </option>
                    ))}
                  </select>
                </div>

                {/* Revisi */}
                <div>
                  <label className="block text-xs font-medium">Total Revisi</label>
                  <select
                    value={v.revisions}
                    onChange={(e) => update(t, { revisions: Number(e.target.value) })}
                    className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-gray-900"
                  >
                    <option value={0}>0</option>
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((r) => (
                      <option key={r} value={r}>
                        {r}x
                      </option>
                    ))}
                    <option value={99}>Unlimited</option>
                  </select>
                </div>

                {/* Harga */}
                <div>
                  <label className="block text-xs font-medium">Harga (min Rp 15.000)</label>
                  <input
                    type="number"
                    min={15000}
                    step={1000}
                    value={v.price}
                    onChange={(e) => update(t, { price: Number(e.target.value) })}
                    className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-gray-900"
                  />
                </div>

                {/* Specials */}
                {serviceType && specials.length > 0 && (
                  <div>
                    <div className="mb-1 text-xs font-medium">Special</div>
                    <div className="space-y-1">
                      {specials.map((s) => {
                        const checked = Boolean(v.specials?.[s.key]);
                        return (
                          <label key={s.key} className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={checked} onChange={() => update(t, { specials: { ...v.specials, [s.key]: !checked } })} className="h-4 w-4" />
                            <span>{s.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-500">Tips: Buat perbedaan jelas antar tier (fitur, durasi, revisi, harga).</p>
    </section>
  );
}
