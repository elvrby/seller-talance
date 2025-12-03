"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
  collectionGroup,
  getDocs,
  limit,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/libs/firebase/config";

type TierKey = "basic" | "standard" | "premium";

type TierMapEntry = {
  description?: string;
  price: number;
  deliveryDays?: number;
  revisions?: number;
  specials?: {
    colorGrading?: boolean;
    rawFiles?: boolean;
  };
};

type Tier = {
  id: TierKey;
  label: string;
  description?: string;
  price: number;
  deliveryDays?: number;
  revisions?: number;
  specials?: {
    colorGrading?: boolean;
    rawFiles?: boolean;
  };
};

type Product = {
  id: string; // doc.id (DwrJahjH5MbjI3v3Y7Js)
  productId?: string; // field productId (boleh sama dengan doc.id)
  title: string;
  serviceType?: string;
  qaTemplate?: string;
  coverUrl?: string;
  images: string[];
  tiers: Tier[];
  ownerId?: string;
  status?: string;
};

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string | undefined; // ini = productId di dokumen

  const [product, setProduct] = useState<Product | null>(null);
  const [selectedTierId, setSelectedTierId] = useState<TierKey | null>(null);
  const [mainImage, setMainImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchProduct = async () => {
      setLoading(true);
      setError(null);

      try {
        // Cari di SEMUA subkoleksi bernama "products" di Firestore
        // termasuk: /users/{uid}/products/{productDocId}
        const q = query(
          collectionGroup(db, "products"),
          where("productId", "==", id),
          limit(1)
        );

        const snap = await getDocs(q);

        if (snap.empty) {
          setError("Product tidak ditemukan.");
          setProduct(null);
          return;
        }

        const docSnap = snap.docs[0];
        const data = docSnap.data() as any;

        if (data.status && data.status !== "published") {
          setError("Product ini belum dipublikasikan.");
          setProduct(null);
          return;
        }

        // Ambil images
        const mediaImages: string[] = Array.isArray(data.media?.images)
          ? data.media.images
          : [];
        const images: string[] = mediaImages.length ? mediaImages : [];

        const coverUrl: string | undefined =
          data.coverUrl ??
          data.media?.coverUrl ??
          (images.length ? images[0] : undefined);

        // Mapping tiers map -> array
        const tiersMap: Record<string, TierMapEntry> = data.tiers ?? {};
        const tierOrder: TierKey[] = ["basic", "standard", "premium"];
        const tierLabel: Record<TierKey, string> = {
          basic: "Basic",
          standard: "Standard",
          premium: "Premium",
        };

        const tiers: Tier[] = tierOrder
          .filter((key) => key in tiersMap)
          .map((key) => {
            const t = tiersMap[key] as TierMapEntry;
            return {
              id: key,
              label: tierLabel[key],
              description: t.description,
              price: t.price,
              deliveryDays: t.deliveryDays,
              revisions: t.revisions,
              specials: t.specials,
            };
          });

        const p: Product = {
          id: docSnap.id,
          productId: data.productId,
          title: data.title ?? "Untitled Product",
          serviceType: data.serviceType,
          qaTemplate: data.qaTemplate,
          coverUrl,
          images,
          tiers,
          ownerId: data.ownerId,
          status: data.status,
        };

        setProduct(p);

        if (coverUrl) setMainImage(coverUrl);
        else if (images.length > 0) setMainImage(images[0]);

        if (tiers.length > 0) setSelectedTierId(tiers[0].id);
      } catch (err: any) {
        console.error("Error fetch product:", err);
        if (err?.code === "permission-denied") {
          setError("Kamu tidak punya akses untuk melihat produk ini.");
        } else {
          setError("Terjadi kesalahan saat mengambil data produk.");
        }
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  const selectedTier = useMemo(() => {
    if (!product || !selectedTierId) return null;
    return product.tiers.find((t) => t.id === selectedTierId) ?? null;
  }, [product, selectedTierId]);

  const formatCurrency = (val: number) => {
    if (typeof val !== "number") return "-";
    try {
      return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(val);
    } catch {
      return `Rp ${val.toLocaleString("id-ID")}`;
    }
  };

  const handleAddToCart = () => {
    if (!product || !selectedTier) return;

    try {
      if (typeof window === "undefined") return;

      const existing = window.localStorage.getItem("cartItems");
      const parsed: any[] = existing ? JSON.parse(existing) : [];

      const newItem = {
        productId: product.productId ?? product.id,
        title: product.title,
        tierId: selectedTier.id,
        tierName: selectedTier.label,
        price: selectedTier.price,
        quantity: 1,
      };

      parsed.push(newItem);
      window.localStorage.setItem("cartItems", JSON.stringify(parsed));

      alert("Produk ditambahkan ke cart.");
    } catch (err) {
      console.error("Add to cart error:", err);
      alert("Gagal menambahkan ke cart.");
    }
  };

  const handleBuyNow = () => {
    if (!product || !selectedTier) return;
    setProcessing(true);

    try {
      handleAddToCart();
      router.push("/cart");
    } catch (err) {
      console.error("Buy now error:", err);
      alert("Terjadi kesalahan saat proses pembelian.");
    } finally {
      setProcessing(false);
    }
  };

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-600 text-sm">Loading product...</p>
      </div>
    );
  }

  // Error / not found
  if (error || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="max-w-md w-full text-center px-4">
          <p className="text-red-600 mb-4 text-sm">
            {error ?? "Product tidak ditemukan."}
          </p>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm"
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  // UI utama
  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="max-w-5xl mx-auto px-4 lg:px-0">
        <button
          className="mb-4 text-sm text-slate-500 hover:text-slate-800"
          onClick={() => router.back()}
        >
          ← Kembali
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 bg-white p-6 md:p-8 rounded-2xl shadow-sm">
          {/* Left: gambar */}
          <div>
            <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-slate-100">
              {mainImage ? (
                <Image
                  src={mainImage}
                  alt={product.title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-slate-400 text-sm">
                  No Image
                </div>
              )}
            </div>

            {product.images && product.images.length > 1 && (
              <div className="mt-4 flex gap-3 overflow-x-auto">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setMainImage(img)}
                    className={`relative w-20 h-20 rounded-xl overflow-hidden border flex-shrink-0 ${
                      mainImage === img
                        ? "border-slate-900"
                        : "border-slate-200 hover:border-slate-400"
                    }`}
                  >
                    <Image
                      src={img}
                      alt={`${product.title} ${idx + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: info + tiers + actions */}
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">
                {product.title}
              </h1>
              {product.serviceType && (
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                  {product.serviceType}
                </p>
              )}
              {product.qaTemplate && (
                <p className="mt-2 text-xs md:text-sm text-slate-500 whitespace-pre-line">
                  Template chat awal: {product.qaTemplate}
                </p>
              )}
            </div>

            {/* Pilihan tier */}
            {product.tiers && product.tiers.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-slate-800">
                  Pilih paket / tier
                </p>
                <div className="grid gap-3">
                  {product.tiers.map((tier) => {
                    const active = selectedTierId === tier.id;
                    return (
                      <button
                        key={tier.id}
                        type="button"
                        onClick={() => setSelectedTierId(tier.id)}
                        className={[
                          "w-full text-left rounded-2xl border p-4 transition-all",
                          active
                            ? "border-slate-900 bg-slate-900/5"
                            : "border-slate-200 hover:border-slate-400",
                        ].join(" ")}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm md:text-base font-semibold text-slate-900">
                              {tier.label}
                            </p>
                            {tier.description && (
                              <p className="mt-1 text-xs md:text-sm text-slate-600">
                                {tier.description}
                              </p>
                            )}
                            <p className="mt-1 text-[11px] md:text-xs text-slate-500">
                              {tier.deliveryDays != null &&
                                `${tier.deliveryDays} hari delivery · `}
                              {tier.revisions != null &&
                                `${tier.revisions} revisi`}
                            </p>
                          </div>
                          <p className="text-sm md:text-base font-semibold text-slate-900">
                            {formatCurrency(tier.price)}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Harga tier terpilih */}
            {selectedTier && (
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-slate-500">
                  Harga paket {selectedTier.label}
                </span>
                <span className="text-xl md:text-2xl font-semibold text-slate-900">
                  {formatCurrency(selectedTier.price)}
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="mt-2 flex flex-col md:flex-row gap-3">
              <button
                type="button"
                onClick={handleBuyNow}
                disabled={!selectedTier || processing}
                className="flex-1 inline-flex items-center justify-center rounded-xl bg-slate-900 text-white text-sm md:text-base font-medium px-4 py-3 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {processing ? "Processing..." : "Buy Now"}
              </button>
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!selectedTier}
                className="flex-1 inline-flex items-center justify-center rounded-xl border border-slate-300 text-slate-900 text-sm md:text-base font-medium px-4 py-3 hover:border-slate-500 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Add to Cart
              </button>
            </div>

            {/* Chart perbandingan tier */}
            {product.tiers.length > 0 && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <p className="text-xs md:text-sm font-medium text-slate-800 mb-2">
                  Perbandingan paket
                </p>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs md:text-sm text-left border border-slate-200 rounded-xl overflow-hidden">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 border-b border-slate-200">
                          Paket
                        </th>
                        <th className="px-3 py-2 border-b border-slate-200">
                          Harga
                        </th>
                        <th className="px-3 py-2 border-b border-slate-200">
                          Delivery
                        </th>
                        <th className="px-3 py-2 border-b border-slate-200">
                          Revisi
                        </th>
                        <th className="px-3 py-2 border-b border-slate-200">
                          Color Grading
                        </th>
                        <th className="px-3 py-2 border-b border-slate-200">
                          Raw Files
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {product.tiers.map((tier) => (
                        <tr key={tier.id}>
                          <td className="px-3 py-2 border-b border-slate-100">
                            {tier.label}
                          </td>
                          <td className="px-3 py-2 border-b border-slate-100">
                            {formatCurrency(tier.price)}
                          </td>
                          <td className="px-3 py-2 border-b border-slate-100">
                            {tier.deliveryDays != null
                              ? `${tier.deliveryDays} hari`
                              : "-"}
                          </td>
                          <td className="px-3 py-2 border-b border-slate-100">
                            {tier.revisions != null
                              ? `${tier.revisions}x`
                              : "-"}
                          </td>
                          <td className="px-3 py-2 border-b border-slate-100">
                            {tier.specials?.colorGrading ? "✔️" : "—"}
                          </td>
                          <td className="px-3 py-2 border-b border-slate-100">
                            {tier.specials?.rawFiles ? "✔️" : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="mt-4 border-t border-slate-100 pt-4 text-xs md:text-sm text-slate-500">
              <p>Produk ini dikelola oleh penjual di platform Talance.</p>
              <p className="mt-1">
                Proses pembayaran & Midtrans bisa kamu lanjutkan di halaman cart
                / checkout.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
