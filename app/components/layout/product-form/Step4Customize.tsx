// app/components/layout/product-form/Step4Customize.tsx
"use client";

type Props = {
  qaTemplate: string;
  status: "draft" | "published";
  onChange: (v: { qaTemplate?: string; status?: "draft" | "published" }) => void;
};

export default function Step4Customize({ qaTemplate, status, onChange }: Props) {
  return (
    <section className="space-y-6">
      <div>
        <label className="block text-sm font-medium">Pesan otomatis (Q&A) saat pembeli chat</label>
        <textarea
          value={qaTemplate}
          onChange={(e) => onChange({ qaTemplate: e.target.value })}
          className="mt-1 h-28 w-full resize-none rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-gray-900"
          placeholder="Halo! Terima kasih sudah menghubungi saya 👋 Ada yang bisa saya bantu?"
          maxLength={800}
        />
        <p className="mt-1 text-xs text-gray-500">Pesan ini akan terkirim otomatis saat pembeli membuka chat pertama kali.</p>
      </div>

      <div>
        <label className="block text-sm font-medium">Status Produk</label>
        <div className="mt-2 flex gap-2">
          <button type="button" onClick={() => onChange({ status: "draft" })} className={`rounded-xl border px-3 py-2 text-sm ${status === "draft" ? "border-gray-900" : "border-gray-200"}`}>
            Draft
          </button>
          <button type="button" onClick={() => onChange({ status: "published" })} className={`rounded-xl border px-3 py-2 text-sm ${status === "published" ? "border-gray-900" : "border-gray-200"}`}>
            Publish
          </button>
        </div>
      </div>
    </section>
  );
}
