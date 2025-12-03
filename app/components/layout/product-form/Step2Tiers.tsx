// app/components/layout/product-form/Step2Tiers.tsx
"use client";

import { useEffect, useMemo, useRef, useState, useId } from "react";
import type { ServiceType } from "./Step1Basic";

export type TierForm = {
  description: string;
  deliveryDays: number; // 1..10
  revisions: number; // 0..10 (99=unlimited)
  price: number; // >=15000
  specials: Record<string, boolean>;
};

type Props = {
  serviceType: ServiceType | null;
  value: Record<"basic" | "standard" | "premium", TierForm>;
  onChange: (tiers: Props["value"]) => void;
};

const SPECIALS_BY_TYPE: Record<
  ServiceType,
  Array<{ key: string; label: string }>
> = {
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

/* ===========================
   UI Icons (no deps)
=========================== */
function ChevronDown(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" fill="currentColor" {...props}>
      <path d="M5.23 7.21a.75.75 0 011.06.02L10 10.06l3.71-2.83a.75.75 0 11.92 1.18l-4.25 3.25a.75.75 0 01-.92 0L5.21 8.41a.75.75 0 01.02-1.2z" />
    </svg>
  );
}
function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      {...props}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 10.5l3 3 7-7" />
    </svg>
  );
}

/* ===========================
   Responsive Select (unified)
   - Mobile & Desktop: custom Listbox
=========================== */
type Option = { value: string | number; label: string; hint?: string };

type ResponsiveSelectProps = {
  label?: string;
  value: string | number;
  onChange: (v: string | number) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
};

function ResponsiveSelect({
  label,
  value,
  onChange,
  options,
  placeholder = "Pilih opsi",
  disabled,
}: ResponsiveSelectProps) {
  return (
    <Listbox
      label={label}
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
}

type ListboxProps = ResponsiveSelectProps;
function Listbox({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: ListboxProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(() =>
    Math.max(
      0,
      options.findIndex((o) => String(o.value) === String(value))
    )
  );
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);
  const uid = useId();
  const popId = `listbox-popover-${uid}`;

  // Tutup saat klik/ketuk di luar — pakai pointerdown agar mobile oke
  useEffect(() => {
    const handler = (e: PointerEvent) => {
      if (!open) return;
      const t = e.target as Node;
      if (!btnRef.current?.contains(t) && !popRef.current?.contains(t)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [open]);

  // Sinkronkan activeIndex saat value/options berubah
  useEffect(() => {
    setActiveIndex(
      Math.max(
        0,
        options.findIndex((o) => String(o.value) === String(value))
      )
    );
  }, [value, options]);

  const selected = options.find((o) => String(o.value) === String(value));

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (
      !open &&
      (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")
    ) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = options[activeIndex];
      if (opt) onChange(opt.value);
      setOpen(false);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      {label && <label className="block text-xs font-medium">{label}</label>}

      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((s) => !s)}
        onKeyDown={onKeyDown}
        className={[
          "mt-1 flex w-full items-center justify-between rounded-xl border border-gray-300 bg-white px-3 py-2",
          "disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400",
        ].join(" ")}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={popId}
      >
        <span className="truncate text-left">
          {selected ? (
            <span className="flex items-center gap-2">
              <span className="truncate">{selected.label}</span>
              {selected.hint && (
                <span className="rounded-full border border-gray-200 px-2 py-0.5 text-[10px] text-gray-500">
                  {selected.hint}
                </span>
              )}
            </span>
          ) : (
            <span className="text-gray-400">{placeholder}</span>
          )}
        </span>
        <ChevronDown
          className={`h-5 w-5 text-gray-400 transition ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Popover */}
      {open && (
        <div
          id={popId}
          ref={popRef}
          className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
          role="listbox"
          tabIndex={-1}
          onKeyDown={onKeyDown}
        >
          <div className="max-h-64 overflow-auto py-1">
            {options.map((o, i) => {
              const isActive = i === activeIndex;
              const isSelected = String(o.value) === String(value);
              return (
                <div
                  key={String(o.value)}
                  role="option"
                  aria-selected={isSelected}
                  className={[
                    "flex cursor-pointer items-center justify-between px-3 py-2 text-sm",
                    isActive ? "bg-gray-50" : "",
                  ].join(" ")}
                  onMouseEnter={() => setActiveIndex(i)}
                  onTouchStart={() => setActiveIndex(i)}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate">{o.label}</span>
                    {o.hint && (
                      <span className="hidden md:inline-block rounded-full border border-gray-200 px-2 py-0.5 text-[10px] text-gray-500">
                        {o.hint}
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <CheckIcon className="h-4 w-4 text-gray-900" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ===========================
   Fancy Checkbox (polished)
=========================== */
type FancyCheckboxProps = {
  checked: boolean;
  onChange: () => void;
  label: string;
  rounded?: "md" | "lg" | "full";
};
function FancyCheckbox({
  checked,
  onChange,
  label,
  rounded = "lg",
}: FancyCheckboxProps) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="group inline-flex select-none items-center gap-2"
      aria-pressed={checked}
    >
      <span
        className={[
          "inline-flex h-5 w-5 items-center justify-center border transition-all duration-150",
          checked
            ? "border-gray-900 bg-gray-900 text-white"
            : "border-gray-300 bg-white text-transparent",
          rounded === "full"
            ? "rounded-full"
            : rounded === "md"
            ? "rounded-md"
            : "rounded-lg",
          "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gray-900/10",
        ].join(" ")}
      >
        <CheckIcon
          className={[
            "h-3.5 w-3.5 transition",
            checked ? "opacity-100 scale-100" : "opacity-0 scale-75",
          ].join(" ")}
        />
      </span>
      <span className="text-sm">{label}</span>
    </button>
  );
}

/* ===========================
   Main Component
=========================== */
export default function Step2Tiers({ serviceType, value, onChange }: Props) {
  const specials = useMemo(() => {
    if (!serviceType) return [];
    return SPECIALS_BY_TYPE[serviceType] || [];
  }, [serviceType]);

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

  // Opsi modern (dengan hint kecil biar terlihat “rich”)
  const deliveryOptions: Option[] = Array.from(
    { length: 10 },
    (_, i) => i + 1
  ).map((d) => ({
    value: d,
    label: `${d} hari`,
    hint: d <= 3 ? "Cepat" : d >= 8 ? "Santai" : undefined,
  }));
  const revisionOptions: Option[] = [
    { value: 0, label: "Tanpa revisi" },
    ...Array.from({ length: 10 }, (_, i) => i + 1).map((r) => ({
      value: r,
      label: `${r}x`,
      hint: r >= 5 ? "Fleksibel" : undefined,
    })),
    { value: 99, label: "Unlimited" },
  ];

  return (
    <section className="space-y-6">
      {!serviceType && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-800 text-sm">
          Pilih tipe jasa dulu di langkah 1 agar opsi <b>Special</b> muncul
          sesuai kategori.
        </div>
      )}

      {/* Responsive grid: 1 col mobile, 3 col desktop */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {TIERS.map((t) => {
          const v = value[t];
          return (
            <div key={t} className="rounded-xl border border-gray-200 p-3">
              <div className="mb-2 text-sm font-semibold capitalize">{t}</div>

              <div className="space-y-3">
                {/* Deskripsi */}
                <div>
                  <label className="block text-xs font-medium">
                    Deskripsi (≤ 400 kata)
                  </label>
                  <textarea
                    value={v.description}
                    onChange={(e) => update(t, { description: e.target.value })}
                    className="mt-1 h-24 w-full resize-none rounded-xl border border-gray-300 px-3 py-2 outline-none transition "
                    maxLength={2000}
                    placeholder="Ceritakan apa yang didapat pembeli di tier ini…"
                  />
                </div>

                {/* Waktu (Listbox unified) */}
                <ResponsiveSelect
                  label="Waktu Pengerjaan"
                  value={v.deliveryDays}
                  onChange={(val) => update(t, { deliveryDays: Number(val) })}
                  options={deliveryOptions}
                  placeholder="Pilih durasi"
                />

                {/* Revisi (Listbox unified) */}
                <ResponsiveSelect
                  label="Total Revisi"
                  value={v.revisions}
                  onChange={(val) => update(t, { revisions: Number(val) })}
                  options={revisionOptions}
                  placeholder="Pilih revisi"
                />

                {/* Harga */}
                <div>
                  <label className="block text-xs font-medium">
                    Harga (min Rp 15.000)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={
                      v.price
                        ? new Intl.NumberFormat("id-ID").format(v.price)
                        : ""
                    }
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "");
                      const num = digits ? Number(digits) : 0;
                      update(t, { price: num });
                    }}
                    onBlur={() => {
                      if (v.price && v.price < 15000)
                        update(t, { price: 15000 });
                    }}
                    className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 outline-none transition focus:border-gray-900 focus:ring-4 focus:ring-gray-900/10"
                    placeholder="15.000"
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
                          <FancyCheckbox
                            key={s.key}
                            checked={checked}
                            onChange={() =>
                              update(t, {
                                specials: { ...v.specials, [s.key]: !checked },
                              })
                            }
                            label={s.label}
                            rounded="lg"
                          />
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

      <p className="text-xs text-gray-500">
        Tips: Buat perbedaan jelas antar tier (fitur, durasi, revisi, harga).
      </p>
    </section>
  );
}
