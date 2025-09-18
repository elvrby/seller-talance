// app/components/ui/delete.tsx
"use client";

import React from "react";

export type Props = {
  open: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  // Wajib: aksi konfirmasi
  onConfirm: () => void | Promise<void>;
  // Baru: dukungan onClose opsional (alias untuk tutup)
  onClose?: () => void;
  // Opsi alternatif (kalau kamu lebih suka pola controlled)
  onOpenChange?: (open: boolean) => void;
};

export default function DeleteConfirm({
  open,
  title = "Hapus item?",
  message = "Tindakan ini tidak dapat dibatalkan.",
  confirmText = "Hapus",
  cancelText = "Batal",
  loading = false,
  onConfirm,
  onClose,
  onOpenChange,
}: Props) {
  // fungsi tutup yang fleksibel
  const close = () => {
    if (loading) return;
    if (onClose) onClose();
    else if (onOpenChange) onOpenChange(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={close} aria-hidden="true" />
      {/* dialog */}
      <div className="relative z-10 w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <p className="mt-2 text-sm text-gray-600">{message}</p>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button type="button" onClick={close} disabled={loading} className="rounded-lg border border-gray-300 px-4 py-2 text-gray-800 hover:bg-gray-100 disabled:opacity-50">
            {cancelText}
          </button>
          <button type="button" onClick={onConfirm} disabled={loading} className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50">
            {loading ? "Menghapus…" : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
