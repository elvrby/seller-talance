// app/components/layout/product-form/Step1Basic.tsx
"use client";

import { useMemo, useState } from "react";

export const SERVICE_GROUPS = {
  Web: ["Frontend", "Backend", "WordPress"],
  Editing: ["Video Editing", "Photo Editing", "Illustrator", "Design"],
  Writing: ["Copywriting", "Technical Writing", "Translation"],
  Programming: ["UI/UX", "Fullstack Development", "SEO Analysis"],
} as const;

export type ServiceType = keyof typeof SERVICE_GROUPS;

type Props = {
  value: {
    title: string;
    serviceType: ServiceType | null;
    subServices: string[];
  };
  onChange: (v: Partial<Props["value"]>) => void;
};

const MAX_SUB = 3;

export default function Step1Basic({ value, onChange }: Props) {
  const { title, serviceType, subServices } = value;

  const options = useMemo(() => {
    return serviceType ? SERVICE_GROUPS[serviceType] : [];
  }, [serviceType]);

  const toggleSub = (name: string) => {
    if (!serviceType) return;
    if (subServices.includes(name)) {
      onChange({ subServices: subServices.filter((x) => x !== name) });
    } else {
      if (subServices.length >= MAX_SUB) return;
      onChange({ subServices: [...subServices, name] });
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700">Nama Produk/Jasa</label>
        <input
          value={title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="I want ..."
          className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-gray-900"
        />
        <p className="mt-1 text-xs text-gray-500">Contoh: “I will build a responsive landing page”, “I will edit your travel vlog”.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Tipe Jasa (pilih satu)</label>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(Object.keys(SERVICE_GROUPS) as ServiceType[]).map((cat) => {
            const active = serviceType === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() =>
                  onChange({
                    serviceType: cat,
                    subServices: [], // reset saat ganti kategori
                  })
                }
                className={`rounded-xl border px-3 py-2 text-sm hover:bg-gray-50 ${active ? "border-gray-900" : "border-gray-200"}`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {serviceType && (
        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">
              Sub-jasa {serviceType} (maks {MAX_SUB})
            </label>
            <div className="text-xs text-gray-500">
              {subServices.length}/{MAX_SUB}
            </div>
          </div>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {options.map((op) => {
              const checked = subServices.includes(op);
              const disabled = !checked && subServices.length >= MAX_SUB;
              return (
                <label key={op} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${checked ? "border-gray-900" : "border-gray-200"} ${disabled ? "opacity-50" : ""}`}>
                  <input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggleSub(op)} className="h-4 w-4" />
                  <span>{op}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
