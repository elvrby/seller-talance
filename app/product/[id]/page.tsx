"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/libs/firebase/config";

export default function ProductDetailPage() {
  const { id } = useParams();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [mainImage, setMainImage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProduct() {
      try {
        setLoading(true);
        const ref = doc(db, "products", id as string);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          setProduct(null);
        } else {
          const data = { id: snap.id, ...snap.data() } as any;
          setProduct(data);
          const firstTier = data.tiers ? Object.keys(data.tiers)[0] : null;
          setSelectedTier(firstTier);
          setMainImage(data.media?.images?.[0] ?? null);
        }
      } catch (err) {
        console.error("Error fetching product:", err);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    }

    if (id) fetchProduct();
  }, [id]);

  if (loading)
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded-lg w-32" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="h-96 bg-gray-200 rounded-2xl" />
                <div className="flex gap-3">
                  <div className="h-20 w-24 bg-gray-200 rounded-lg" />
                  <div className="h-20 w-24 bg-gray-200 rounded-lg" />
                  <div className="h-20 w-24 bg-gray-200 rounded-lg" />
                </div>
              </div>
              <div className="space-y-4">
                <div className="h-8 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
                <div className="h-64 bg-gray-200 rounded-2xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );

  if (!product)
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">😕</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Produk Tidak Ditemukan
            </h2>
            <p className="text-gray-500">
              Maaf, produk yang Anda cari tidak tersedia.
            </p>
          </div>
        </div>
      </div>
    );

  const tiers = product.tiers || {};

  function formatRupiah(num: number | undefined) {
    if (!num && num !== 0) return "-";
    return `Rp ${Number(num).toLocaleString("id-ID")}`;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-6 text-sm text-gray-500">
          <span className="hover:text-gray-700 cursor-pointer">Home</span>
          <span className="mx-2">/</span>
          <span className="hover:text-gray-700 cursor-pointer">Products</span>
          <span className="mx-2">/</span>
          <span className="text-gray-800 font-medium">{product.title}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* LEFT: Images */}
          <div className="space-y-4">
            <div className="relative rounded-2xl overflow-hidden bg-white shadow-xl border border-gray-200 group">
              {mainImage ? (
                <img
                  src={mainImage}
                  alt={product.title}
                  className="w-full h-[400px] md:h-[500px] object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-[400px] md:h-[500px] bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl mb-2">📦</div>
                    <p className="text-gray-400 font-medium">
                      No image available
                    </p>
                  </div>
                </div>
              )}
              <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">
                New
              </div>
            </div>

            {/* Thumbnails */}
            {product.media?.images && product.media.images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {product.media.images.map((img: string, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setMainImage(img)}
                    className={`flex-none rounded-xl overflow-hidden transition-all duration-300 ${
                      mainImage === img
                        ? "border-4 border-green-500 shadow-lg scale-105"
                        : "border-2 border-gray-200 hover:border-green-300 opacity-70 hover:opacity-100"
                    }`}
                    style={{ width: 100, height: 80 }}
                    aria-label={`Thumbnail ${idx + 1}`}
                  >
                    <img
                      src={img}
                      className="w-full h-full object-cover"
                      alt={`thumb-${idx}`}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: Info */}
          <div className="space-y-6">
            {/* Product Header */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                {product.title}
              </h1>
              {product.subtitle && (
                <p className="text-base text-gray-500 flex items-center gap-2">
                  <span className="inline-block w-1 h-4 bg-green-500 rounded"></span>
                  {product.subtitle}
                </p>
              )}
            </div>

            {/* Tiers Selection */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <span className="text-green-500">●</span>
                Pilih Paket
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {Object.keys(tiers).length === 0 && (
                  <div className="col-span-2 text-center py-8 text-gray-400">
                    No tiers available
                  </div>
                )}

                {Object.entries(tiers).map(([key, val]: any) => (
                  <button
                    key={key}
                    onClick={() => setSelectedTier(key)}
                    className={`p-4 rounded-xl border-2 transition-all duration-300 text-left ${
                      selectedTier === key
                        ? "bg-gradient-to-br from-green-500 to-emerald-600 text-white border-green-500 shadow-xl scale-105"
                        : "bg-white text-gray-800 border-gray-200 hover:border-green-300 hover:shadow-md"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-sm font-bold uppercase tracking-wide">
                        {key}
                      </div>
                      {selectedTier === key && (
                        <svg
                          className="w-5 h-5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                    <div
                      className={`text-xs ${
                        selectedTier === key
                          ? "text-green-100"
                          : "text-gray-500"
                      }`}
                    >
                      {val?.subtitle || "Standard package"}
                    </div>
                  </button>
                ))}
              </div>

              {/* Selected Tier Details */}
              {selectedTier && tiers[selectedTier] && (
                <div className="border-t border-gray-200 pt-6 space-y-4">
                  <p className="text-gray-700 leading-relaxed">
                    {tiers[selectedTier]?.description ||
                      "No description available"}
                  </p>

                  <div className="flex items-baseline gap-3 flex-wrap">
                    <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                      {formatRupiah(tiers[selectedTier]?.price)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      {tiers[selectedTier]?.delivery || "Instant"}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button className="flex-1 px-6 py-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                      Beli Sekarang
                    </button>
                    <button className="px-6 py-4 rounded-xl border-2 border-gray-200 hover:border-green-500 font-semibold text-gray-700 hover:text-green-600 transition-all duration-300 hover:shadow-md flex items-center justify-center gap-2">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                      </svg>
                      <span className="hidden sm:inline">Chat</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <span className="text-green-500">●</span>
                Deskripsi Produk
              </h3>
              <div className="prose max-w-none text-gray-700 leading-relaxed">
                {product.description ? (
                  <p className="whitespace-pre-line">{product.description}</p>
                ) : (
                  <p className="text-gray-400 italic">
                    No description available
                  </p>
                )}
              </div>
            </div>

            {/* Meta Information */}
            {product.sku && (
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl px-4 py-3 border border-gray-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 font-medium">SKU:</span>
                  <span className="text-gray-800 font-mono bg-white px-3 py-1 rounded-lg">
                    {product.sku}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
