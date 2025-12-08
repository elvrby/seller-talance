// app/products/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  collection,
  onSnapshot,
  query,
  where,
  deleteDoc,
  doc as firestoreDoc,
} from "firebase/firestore";
import { db, firebaseAuth } from "@/libs/firebase/config";
import { useAuthGuard } from "@/app/hooks/use-auth-guard";
import DeleteConfirm from "@/app/components/ui/delete";

type ProductRow = {
  id: string;
  productId?: string;
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

  // modal delete
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [target, setTarget] = useState<ProductRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    // listen to top-level products where ownerId == user.uid
    const colRef = collection(db, "products");
    const q = query(colRef, where("ownerId", "==", user.uid));

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
            subServices: Array.isArray(d?.subServices)
              ? d.subServices.filter(Boolean)
              : [],
            coverUrl:
              d?.coverUrl ??
              d?.media?.coverUrl ??
              (Array.isArray(d?.media?.images) ? d.media.images[0] : undefined),
            media: d?.media ?? undefined,
            status: d?.status === "published" ? "published" : "draft",
          });
        });
        setItems(rows);
        setLoading(false);
      },
      (err) => {
        // logging supaya gampang debug kalau rules / koneksi gagal
        console.error("[products] snapshot error:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user]);

  const askDelete = (item: ProductRow) => {
    setTarget(item);
    setConfirmOpen(true);
  };

  const onConfirmDelete = async () => {
    if (!target) return;
    if (!user) {
      alert("Kamu harus login untuk menghapus produk.");
      return;
    }

    setDeleting(true);

    try {
      const current = firebaseAuth.currentUser;
      if (!current) throw new Error("not-auth");
      const token = await current.getIdToken(true);

      // gunakan productId kalau tersedia (konsistensi)
      const idToDelete = target.productId ?? target.id;

      // try server-side delete first
      const res = await fetch(`/api/products/${idToDelete}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setConfirmOpen(false);
        setTarget(null);
        return;
      }

      // if server failed, fallback to client-side delete (top-level products/{id})
      const docRef = firestoreDoc(db, "products", idToDelete);
      await deleteDoc(docRef);

      setConfirmOpen(false);
      setTarget(null);
    } catch (err: any) {
      console.error("[products] delete error:", err);
      if (err?.code === "permission-denied") {
        alert("Kamu tidak punya izin menghapus produk ini (periksa rules).");
      } else {
        alert(err?.message || "Gagal menghapus produk.");
      }
    } finally {
      setDeleting(false);
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
    <main className="mx-auto w-full max-w-5xl px-3 py-4 sm:px-4 md:px-6">
      <div className="mb-4 flex flex-col gap-2 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold sm:text-2xl">Produk Saya</h1>

        <Link
          href="/product/add-product"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-black px-4 py-2 text-white hover:shadow-xs active:bg-slate-900 sm:w-auto"
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
              d="M12 5v14M5 12h14"
            />
          </svg>
          <span className="text-sm font-medium">Tambahkan Produk</span>
        </Link>
      </div>

      {!loading && items.length === 0 && (
        <div className="rounded-xl border border-dashed p-6 text-center text-sm text-gray-500 sm:p-8">
          Belum ada produk. Klik{" "}
          <span className="font-medium text-gray-900">“Tambahkan Produk”</span>{" "}
          untuk membuat.
        </div>
      )}

      <ul className="space-y-2 sm:space-y-3">
        {items.map((it) => {
          const thumb =
            it.coverUrl ??
            (Array.isArray(it.media?.images) && it.media!.images!.length > 0
              ? it.media!.images![0]
              : undefined) ??
            "https://placehold.co/160x160?text=No+Image";

          // pastikan kita selalu menggunakan productId (fall back to doc id)
          const routeId = it.productId ?? it.id;

          return (
            <li
              key={it.id}
              className="rounded-xl border border-gray-200 p-3 transition hover:bg-gray-50 sm:p-3.5"
            >
              <div className="grid grid-cols-[64px_1fr] grid-rows-[auto_auto_auto] gap-x-3 gap-y-2 sm:grid-cols-[96px_1fr_auto] sm:grid-rows-[auto_auto] sm:items-center">
                <div className="row-span-2 h-16 w-16 overflow-hidden rounded-lg bg-gray-100 sm:h-24 sm:w-24">
                  <img
                    src={thumb}
                    alt={it.title}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>

                <div className="min-w-0">
                  <div className="flex items-start gap-2 sm:items-center">
                    <Link
                      href={`/product/${routeId}`}
                      className="truncate text-sm font-medium text-gray-900 sm:text-base"
                      title={it.title}
                    >
                      {it.title}
                    </Link>
                    <span
                      className={[
                        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] sm:text-xs",
                        it.status === "published"
                          ? "bg-green-100 text-green-800"
                          : "bg-amber-100 text-amber-800",
                      ].join(" ")}
                      title={`Status: ${it.status ?? "draft"}`}
                    >
                      {it.status ?? "draft"}
                    </span>
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px] text-gray-600 sm:text-xs">
                    {it.serviceType && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5">
                        {it.serviceType}
                      </span>
                    )}
                    {(it.subServices ?? []).slice(0, 2).map((s) => (
                      <span
                        key={s}
                        className="rounded-full bg-gray-100 px-2 py-0.5"
                      >
                        {s}
                      </span>
                    ))}
                    {it.subServices && it.subServices.length > 2 && (
                      <span className="text-gray-400 sm:hidden">
                        +{it.subServices.length - 2}
                      </span>
                    )}
                    <span className="hidden sm:inline">
                      {(it.subServices ?? []).slice(2, 3).map((s) => (
                        <span
                          key={s}
                          className="ml-1 rounded-full bg-gray-100 px-2 py-0.5"
                        >
                          {s}
                        </span>
                      ))}
                      {it.subServices && it.subServices.length > 3 && (
                        <span className="ml-1 text-gray-400">
                          +{it.subServices.length - 3}
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="col-span-2 -mx-1 mt-1 flex items-center gap-1 sm:col-span-1 sm:mx-0 sm:mt-0 sm:justify-end sm:gap-2">
                  <Link
                    href={`/product/edit/${routeId}`}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-2.5 py-1.5 text-gray-800 hover:bg-gray-100 sm:px-3"
                    title="Edit"
                    aria-label="Edit produk"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.232 5.232l3.536 3.536M7 17l8.485-8.485a2 2 0 112.828 2.828L9.828 19.828H7V17z"
                      />
                    </svg>
                    <span className="hidden text-sm sm:inline">Edit</span>
                  </Link>

                  <button
                    onClick={() => askDelete(it)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-300 px-2.5 py-1.5 text-red-600 hover:bg-red-50 sm:px-3"
                    title="Hapus"
                    aria-label="Hapus produk"
                    disabled={deleting}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 7h12M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2m-1 0v12a2 2 0 01-2 2h-4a2 2 0 01-2-2V7h10z"
                      />
                    </svg>
                    <span className="hidden text-sm sm:inline">Hapus</span>
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

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
        message={
          target
            ? `Produk "${target.title}" akan dihapus permanen beserta media terkait.`
            : "Produk akan dihapus permanen."
        }
        confirmText="Hapus"
        cancelText="Batal"
      />
    </main>
  );
}
