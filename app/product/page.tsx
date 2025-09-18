// app/products/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db, firebaseAuth } from "@/libs/firebase/config";
import { useAuthGuard } from "@/app/hooks/use-auth-guard";
import DeleteConfirm from "@/app/components/ui/delete";

type ProductRow = {
  id: string; // Firestore doc id
  productId?: string; // redundan (kita set = doc id saat add)
  title: string;
  serviceType: string | null;
  subServices: string[];
  coverUrl?: string | null;
  media?: {
    images?: string[];
    coverUrl?: string;
  };
  status?: "draft" | "published";
};

export default function ProductsPage() {
  const { user, checking } = useAuthGuard("/account/sign-in", {
    enforceVerified: true,
    enforceFreelanceComplete: true,
  });

  const [items, setItems] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);

  // state untuk modal delete
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [target, setTarget] = useState<ProductRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const colRef = collection(db, "users", user.uid, "products");
    const q = query(colRef);

    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows: ProductRow[] = [];
        snap.forEach((doc) => {
          const d = doc.data() as any;
          rows.push({
            id: doc.id,
            productId: d?.productId ?? doc.id,
            title: String(d?.title ?? "(Tanpa judul)"),
            serviceType: d?.serviceType ?? null,
            subServices: Array.isArray(d?.subServices) ? d.subServices.filter(Boolean) : [],
            coverUrl: d?.coverUrl ?? d?.media?.coverUrl ?? (Array.isArray(d?.media?.images) ? d.media.images[0] : undefined),
            media: d?.media ?? undefined,
            status: d?.status === "published" ? "published" : "draft",
          });
        });
        setItems(rows);
        setLoading(false);
      },
      (err) => {
        console.error("[products] snapshot error:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user]);

  // buka modal delete
  const askDelete = (item: ProductRow) => {
    setTarget(item);
    setConfirmOpen(true);
  };

  // konfirmasi hapus (panggil API server yang sudah kita buat)
  const onConfirmDelete = async () => {
    if (!target) return;
    try {
      if (!firebaseAuth.currentUser) throw new Error("not-auth");
      setDeleting(true);

      const token = await firebaseAuth.currentUser.getIdToken();
      const res = await fetch(`/api/products/${target.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({} as any));
        throw new Error(j?.error || "delete_failed");
      }

      // sukses → tutup modal, target direset
      setConfirmOpen(false);
      setTarget(null);
    } catch (e) {
      console.error("[products] delete error:", e);
      // boleh ganti toast kamu sendiri
      alert("Gagal menghapus produk.");
    } finally {
      setDeleting(false);
    }
  };

  if (checking || !user) {
    return <main className="grid min-h-[calc(100vh-64px)] place-items-center text-sm text-gray-500">Memuat…</main>;
  }

  return (
    <main className="mx-auto max-w-5xl p-4">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Produk Saya</h1>
        <Link href="/product/add-product" className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-white hover:bg-gray-800">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
          </svg>
          Tambahkan Produk
        </Link>
      </div>

      {/* Empty state */}
      {!loading && items.length === 0 && (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-gray-500">
          Belum ada produk. Klik <span className="font-medium text-gray-900">“Tambahkan Produk”</span> untuk membuat.
        </div>
      )}

      {/* List */}
      <ul className="space-y-3">
        {items.map((it) => {
          const thumb = it.coverUrl ?? (Array.isArray(it.media?.images) && it.media!.images!.length > 0 ? it.media!.images![0] : undefined) ?? "https://placehold.co/160x160?text=No+Image";

          return (
            <li key={it.id} className="flex items-center gap-4 rounded-xl border border-gray-200 p-3 hover:bg-gray-50">
              {/* Thumbnail kiri */}
              <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                {/* Pakai <Image> jika domain Cloudinary sudah diizinkan di next.config */}
                <img src={thumb} alt={it.title} className="h-full w-full object-cover" loading="lazy" />
              </div>

              {/* Tengah: judul + meta */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Link href={`/product/edit/${it.id}`} className="truncate text-base font-medium text-gray-900 hover:underline" title={it.title}>
                    {it.title}
                  </Link>
                  <span
                    className={["inline-flex items-center rounded-full px-2 py-0.5 text-xs", it.status === "published" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"].join(" ")}
                    title={`Status: ${it.status ?? "draft"}`}
                  >
                    {it.status ?? "draft"}
                  </span>
                </div>

                {/* chips service */}
                <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-gray-600">
                  {it.serviceType && <span className="rounded-full bg-gray-100 px-2 py-0.5">{it.serviceType}</span>}
                  {it.subServices?.slice(0, 3).map((s) => (
                    <span key={s} className="rounded-full bg-gray-100 px-2 py-0.5">
                      {s}
                    </span>
                  ))}
                  {it.subServices && it.subServices.length > 3 && <span className="text-gray-400">+{it.subServices.length - 3}</span>}
                </div>
              </div>

              {/* Actions kanan */}
              <div className="flex items-center gap-2">
                <Link href={`/product/edit/${it.id}`} className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-3 py-1.5 text-gray-800 hover:bg-gray-100" title="Edit">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M7 17l8.485-8.485a2 2 0 112.828 2.828L9.828 19.828H7V17z" />
                  </svg>
                  Edit
                </Link>

                <button onClick={() => askDelete(it)} className="inline-flex items-center gap-2 rounded-xl border border-red-300 px-3 py-1.5 text-red-600 hover:bg-red-50" title="Hapus">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2m-1 0v12a2 2 0 01-2 2h-4a2 2 0 01-2-2V7h10z" />
                  </svg>
                  Hapus
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Modal konfirmasi hapus */}
      <DeleteConfirm
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!deleting) {
            setConfirmOpen(open);
            if (!open) setTarget(null);
          }
        }}
        onConfirm={onConfirmDelete}
        loading={deleting}
        title="Hapus produk?"
        message={target ? `Produk "${target.title}" akan dihapus permanen beserta media terkait.` : "Produk akan dihapus permanen."}
        confirmText="Hapus"
        cancelText="Batal"
      />
    </main>
  );
}
