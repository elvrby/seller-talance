// app/components/layout/product-form/Step1Basic.tsx
"use client";

import { useMemo } from "react";

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
  onChange: (next: Partial<Props["value"]>) => void;
  maxTitleLength?: number;
};

const MAX_SUB = 3;

/* =============== Small UI =============== */
function CounterBar({
  value,
  max,
  over,
}: {
  value: number;
  max: number;
  over: boolean;
}) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="mt-2">
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={[
            "h-full transition-all",
            over ? "bg-red-500" : "bg-green-600",
          ].join(" ")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1 flex items-center justify-between text-xs">
        <span className="text-gray-500">
          Maksimal {max} karakter (termasuk spasi).
        </span>
        <span className={over ? "text-red-600" : "text-green-600"}>
          {value}/{max}
        </span>
      </div>
    </div>
  );
}

function TypeBlock({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full rounded-lg border px-3 py-2 text-left text-sm transition",
        active
          ? "border-transparent bg-green-600 text-white shadow-sm"
          : "border-gray-200 bg-white hover:bg-green-50",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-green-600/20",
      ].join(" ")}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}

function SubItem({
  label,
  checked,
  disabled,
  onToggle,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      className={[
        "flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm transition",
        checked
          ? "border-transparent  "
          : "border-gray-200 bg-white hover:bg-gray-50",
        disabled ? "cursor-not-allowed opacity-50" : "",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-green-600/15",
      ].join(" ")}
      aria-pressed={checked}
    >
      <span className="truncate">{label}</span>
      <span
        className={[
          "ml-3 inline-flex h-4 w-4 items-center justify-center rounded border",
          checked ? "border-slate-300 bg-white/20" : "border-gray-300 bg-white",
        ].join(" ")}
      >
        <svg
          viewBox="0 0 20 20"
          className={[
            "h-3 w-3",
            checked ? "opacity-100" : "opacity-0",
            "transition-opacity",
          ].join(" ")}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M5 10.5l3 3 7-7" />
        </svg>
      </span>
    </button>
  );
}

/* =============== Main =============== */
export default function Step1Basic({
  value,
  onChange,
  maxTitleLength = 70,
}: Props) {
  const { title, serviceType, subServices } = value;
  const titleLen = title.length;
  const over = titleLen > maxTitleLength;

  const options = useMemo(
    () => (serviceType ? SERVICE_GROUPS[serviceType] : []),
    [serviceType]
  );

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
      {/* Judul */}
      <div>
        <label
          htmlFor="p-title"
          className="block text-sm font-medium text-gray-700"
        >
          Judul Produk
        </label>
        <div className="relative mt-1">
          <input
            id="p-title"
            type="text"
            required
            value={title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="I will do editing for you"
            className={[
              "w-full rounded-xl border px-3 py-2 pr-10 outline-none transition",
              over
                ? "border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/15"
                : "border-gray-300 focus:border-green-600",
            ].join(" ")}
            maxLength={maxTitleLength}
            aria-invalid={over}
          />
          <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
            <div
              className={[
                "h-2 w-2 rounded-full",
                over ? "bg-red-500" : "bg-green-600",
              ].join(" ")}
            />
          </div>
        </div>
        <CounterBar value={titleLen} max={maxTitleLength} over={over} />
      </div>

      {/* Kategori & Sub-jasa dalam satu container */}
      <div className="rounded-xl border border-gray-200">
        {/* Header */}
        <div className="border-b border-gray-200 px-4 py-3">
          <p className="text-sm font-medium text-gray-800">
            Tipe Jasa & Sub-jasa
          </p>
          <p className="text-xs text-gray-500">
            Pilih satu tipe jasa. Setelah dipilih, sub-jasa akan muncul di panel
            kanan.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3">
          {/* Kiri: Tipe Jasa (block list) */}
          <div className="border-b border-gray-200 md:border-b-0 md:border-r md:border-gray-200">
            <div className="p-3 space-y-2">
              {(Object.keys(SERVICE_GROUPS) as ServiceType[]).map((cat) => {
                const active = serviceType === cat;
                return (
                  <TypeBlock
                    key={cat}
                    label={cat}
                    active={active}
                    onClick={() =>
                      onChange({
                        serviceType: cat,
                        subServices: [], // reset saat ganti
                      })
                    }
                  />
                );
              })}
            </div>
          </div>

          {/* Kanan: Sub-jasa (scrollable) */}
          <div className="md:col-span-2">
            {!serviceType ? (
              <div className="p-6 text-sm text-gray-500">
                Pilih tipe jasa di panel kiri untuk melihat sub-jasa.
              </div>
            ) : (
              <div className="p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-sm font-medium text-gray-800">
                    Sub-jasa {serviceType}{" "}
                    <span className="text-gray-400 text-xs">
                      (maks {MAX_SUB})
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {subServices.length}/{MAX_SUB}
                  </div>
                </div>

                {/* Scroll area simple-modern */}
                <div className="scroller grid max-h-56 grid-cols-1 gap-2 overflow-auto pr-1 sm:grid-cols-2">
                  {options.map((op) => {
                    const checked = subServices.includes(op);
                    const disabled = !checked && subServices.length >= MAX_SUB;
                    return (
                      <SubItem
                        key={op}
                        label={op}
                        checked={checked}
                        disabled={disabled}
                        onToggle={() => toggleSub(op)}
                      />
                    );
                  })}
                </div>

                <p className="mt-2 text-xs text-gray-500">
                  Tips: pilih sub-jasa paling relevan agar mudah ditemukan
                  pembeli.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scoped scrollbar styling */}
      <style jsx>{`
        .scroller::-webkit-scrollbar {
          height: 8px;
          width: 8px;
        }
        .scroller::-webkit-scrollbar-thumb {
          background: rgba(22, 163, 74, 0.6);
          border-radius: 9999px;
        }
        .scroller::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.05);
          border-radius: 9999px;
        }
        /* Firefox */
        .scroller {
          scrollbar-width: thin;
          scrollbar-color: rgba(22, 163, 74, 0.7) transparent;
        }
      `}</style>
    </section>
  );
}
