// app/products/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, onSnapshot, orderBy, query, where, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/libs/firebase/config";
import { useAuthGuard } from "@/app/hooks/use-auth-guard";
import DeleteDialog from "@/app/components/ui/delete";

type Product = {
  id: string;
  title: string;
  serviceType: "Web" | "Editing" | "Writing" | "Programming";
  subServices: string[];
  coverUrl?: string | null;
  status: "draft" | "published";
  ownerId: string;
  createdAt?: any;
};

export default function ProductsPage() {
  const { user, checking } = useAuthGuard("/account/sign-in", {
    enforceVerified: true,
    enforceFreelanceComplete: true,
  });

  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // state untuk dialog delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [target, setTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const q = query(collection(db, "products"), where("ownerId", "==", user.uid), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr: Product[] = [];
        snap.forEach((d) => arr.push({ id: d.id, ...(d.data() as any) }));
        setItems(arr);
        setLoading(false);
      },
      (e) => {
        console.error("[products] snapshot error:", e);
        setErr("Gagal memuat produk. Periksa izin Firestore rules.");
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user?.uid]);

  const confirmDelete = async () => {
    if (!target || !user) return;
    setDeleting(true);
    setErr(null);
    try {
      await deleteDoc(doc(db, "products", target.id));
      // NOTE: jika kamu ingin menghapus file di Cloudinary,
      // buat API route khusus dan panggil di sini (perlu public_id).
      setDeleteOpen(false);
      setTarget(null);
    } catch (e: any) {
      console.error("[products] delete error:", e?.code, e?.message);
      setErr("Gagal menghapus produk. Coba lagi.");
    } finally {
      setDeleting(false);
    }
  };

  if (checking || !user) {
    return <main className="grid min-h-[calc(100vh-64px)] place-items-center text-sm text-gray-500">Memuat…</main>;
  }

  return (
    <main className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Produk Saya</h1>
        <Link href="/product/add-product" className="rounded-xl bg-gray-900 px-4 py-2 text-white hover:bg-gray-800">
          + Tambahkan Produk
        </Link>
      </div>

      {err && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</div>}

      {loading ? (
        <div className="rounded-xl border border-gray-200 p-6 text-gray-600">Memuat produk…</div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-gray-200 p-6 text-gray-600">Belum ada produk. Klik “Tambahkan Produk” untuk mulai.</div>
      ) : (
        <ul className="space-y-3">
          {items.map((p) => (
            <li key={p.id} className="flex items-center gap-3 rounded-xl shadow p-3">
              {/* Gambar kiri */}
              {p.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.coverUrl} alt={p.title} className="h-20 w-20 flex-shrink-0 rounded-lg object-cover" />
              ) : (
                <div className="h-20 w-20 flex-shrink-0 rounded-lg bg-gray-100" />
              )}

              {/* Info tengah */}
              <div className="min-w-0 flex-1">
                <div className="text-xs text-gray-500">
                  {p.serviceType} • {p.subServices?.slice(0, 3).join(", ")}
                </div>
                <div className="line-clamp-1 text-base font-medium">{p.title}</div>
                <div className="mt-1 text-xs">
                  <span className={`rounded-full px-2 py-0.5 ${p.status === "published" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-700"}`}>{p.status}</span>
                </div>
              </div>

              {/* Aksi kanan */}
              <div className="flex flex-shrink-0 items-center gap-2">
                <Link href={`/product/edit/${p.id}`} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100">
                  Edit
                </Link>
                <button
                  onClick={() => {
                    setTarget(p);
                    setDeleteOpen(true);
                  }}
                  className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                >
                  Hapus
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Dialog Hapus */}
      <DeleteDialog
        open={deleteOpen}
        onOpenChange={(v) => {
          if (!v && !deleting) setTarget(null);
          setDeleteOpen(v);
        }}
        title="Hapus produk?"
        description={`Produk “${target?.title ?? ""}” akan dihapus permanen.`}
        confirmLabel={deleting ? "Menghapus…" : "Hapus"}
        cancelLabel="Batal"
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </main>
  );
}
