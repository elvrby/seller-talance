/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useMemo, useState } from "react";
import { addDoc, collection, serverTimestamp, type FieldValue } from "firebase/firestore";
import { db } from "@/libs/firebase/config";

export type TicketVariant = {
  variantId: string;
  destinationCity: string;
  price: number;
  active: boolean;
  notes?: string;
};

export type TicketProduct = {
  title: string;
  operatorName: string;
  originCity: string;
  busClass: "Economy" | "Executive" | "Sleeper" | "VIP" | (string & {});
  status: "active" | "inactive";
  createdAt?: FieldValue;
  seatsTotal: number;
  seatsAvailable: number;
  variants: TicketVariant[];
};

type NewTicketProductWrite = Omit<TicketProduct, "createdAt"> & { createdAt: FieldValue };

type AddProductProps = {
  open: boolean;
  onClose: () => void;
  onCreated?: (id: string) => void;
};

const newId = () => globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 10);
const currency = (n: number) => n.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

const AddProduct: React.FC<AddProductProps> = ({ open, onClose, onCreated }) => {
  const [title, setTitle] = useState("");
  const [operatorName, setOperatorName] = useState("");
  const [originCity, setOriginCity] = useState("");
  const [busClass, setBusClass] = useState<TicketProduct["busClass"]>("Executive");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [seatsTotal, setSeatsTotal] = useState<number | "">("");
  const [variants, setVariants] = useState<Array<{ tempId: string; destinationCity: string; price: number | ""; active: boolean; notes: string }>>([
    { tempId: newId(), destinationCity: "", price: "", active: true, notes: "" },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [okOpen, setOkOpen] = useState(false);
  const [failOpen, setFailOpen] = useState<{ open: boolean; message: string }>({ open: false, message: "" });

  const canSubmit = useMemo(() => {
    if (!title.trim() || !operatorName.trim() || !originCity.trim()) return false;
    if (seatsTotal === "" || Number(seatsTotal) < 1) return false;
    if (variants.length === 0) return false;
    for (const v of variants) {
      if (!v.destinationCity.trim()) return false;
      if (v.price === "" || Number(v.price) <= 0) return false;
    }
    return true;
  }, [title, operatorName, originCity, seatsTotal, variants]);

  if (!open) return null;

  const addVariant = () => setVariants((p) => [...p, { tempId: newId(), destinationCity: "", price: "", active: true, notes: "" }]);

  const removeVariant = (id: string) => setVariants((p) => p.filter((v) => v.tempId !== id));

  const updateVariant = (id: string, patch: Partial<{ destinationCity: string; price: number | ""; active: boolean; notes: string }>) =>
    setVariants((p) => p.map((v) => (v.tempId === id ? { ...v, ...patch } : v)));

  const reset = () => {
    setTitle("");
    setOperatorName("");
    setOriginCity("");
    setBusClass("Executive");
    setStatus("active");
    setSeatsTotal("");
    setVariants([{ tempId: newId(), destinationCity: "", price: "", active: true, notes: "" }]);
    setErrorMsg("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!canSubmit) {
      setErrorMsg("Lengkapi produk & minimal satu variant.");
      return;
    }
    const variantsClean: TicketVariant[] = variants.map((v) => ({
      variantId: newId(),
      destinationCity: v.destinationCity.trim(),
      price: Number(v.price),
      active: !!v.active,
      ...(v.notes.trim() ? { notes: v.notes.trim() } : {}),
    }));
    setSubmitting(true);
    try {
      const payload: NewTicketProductWrite = {
        title: title.trim(),
        operatorName: operatorName.trim(),
        originCity: originCity.trim(),
        busClass,
        status,
        seatsTotal: Number(seatsTotal),
        seatsAvailable: Number(seatsTotal),
        variants: variantsClean,
        createdAt: serverTimestamp(),
      };
      const ref = await addDoc(collection(db, "ticketing_products"), payload);
      setOkOpen(true);
      onCreated?.(ref.id);
      reset();
    } catch (err: any) {
      setFailOpen({ open: true, message: err?.message ?? "Gagal menyimpan data." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-2xl bg-white/95 backdrop-blur-xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-black to-gray-800 text-white px-6 py-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Tambah Produk Bus</h3>
            <button onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20" disabled={submitting}>
              Tutup
            </button>
          </div>
          <p className="text-white/70 text-xs mt-1">Satu bus punya kapasitas kursi; variant = destinasi & harga.</p>
        </div>

        <form onSubmit={submit} className="px-6 py-5 space-y-6 max-h-[75vh] overflow-auto">
          {errorMsg && <div className="rounded-xl bg-red-50 text-red-700 px-4 py-3 text-sm">{errorMsg}</div>}

          {/* Info produk */}
          <section className="rounded-2xl bg-white/70 p-4 shadow-sm">
            <h4 className="font-semibold mb-3">Info Produk</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nama Produk</label>
                <input
                  className="mt-1 w-full rounded-xl bg-gray-100/70 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/20"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder='Mis. "Bee Bus"'
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Operator</label>
                <input
                  className="mt-1 w-full rounded-xl bg-gray-100/70 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/20"
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  placeholder="PO / Operator Bus"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Kota Asal</label>
                <input
                  className="mt-1 w-full rounded-xl bg-gray-100/70 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/20"
                  value={originCity}
                  onChange={(e) => setOriginCity(e.target.value)}
                  placeholder="Jakarta"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Kelas Bus</label>
                <select
                  className="mt-1 w-full rounded-xl bg-gray-100/70 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/20"
                  value={busClass}
                  onChange={(e) => setBusClass(e.target.value as any)}
                >
                  <option>Economy</option>
                  <option>Executive</option>
                  <option>VIP</option>
                  <option>Sleeper</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  className="mt-1 w-full rounded-xl bg-gray-100/70 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/20"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                >
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Total Kursi</label>
                <input
                  type="number"
                  min={1}
                  className="mt-1 w-full rounded-xl bg-gray-100/70 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/20"
                  value={seatsTotal}
                  onChange={(e) => setSeatsTotal(e.target.value === "" ? "" : Math.max(1, Number(e.target.value)))}
                  placeholder="40"
                />
              </div>
            </div>
          </section>

          {/* Variants */}
          <section className="rounded-2xl bg-white/70 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold">Destinasi (Variant)</h4>
              <button type="button" onClick={addVariant} className="rounded-xl bg-black text-white px-3 py-2 text-sm hover:bg-black/90">
                + Tambah Variant
              </button>
            </div>

            <div className="space-y-3">
              {variants.map((v, idx) => (
                <div key={v.tempId} className="rounded-xl bg-white/70 p-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">Variant #{idx + 1}</div>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 text-xs">
                        <input type="checkbox" checked={v.active} onChange={(e) => updateVariant(v.tempId, { active: e.target.checked })} />
                        Aktif
                      </label>
                      {variants.length > 1 && (
                        <button type="button" onClick={() => removeVariant(v.tempId)} className="text-xs rounded-lg bg-red-600/10 text-red-700 px-2 py-1 hover:bg-red-600/20">
                          Hapus
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-700">Kota Tujuan</label>
                      <input
                        className="mt-1 w-full rounded-xl bg-gray-100/70 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/20"
                        value={v.destinationCity}
                        onChange={(e) => updateVariant(v.tempId, { destinationCity: e.target.value })}
                        placeholder="Bandung"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Harga (Rp)</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        className="mt-1 w-full rounded-xl bg-gray-100/70 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/20"
                        value={v.price}
                        onChange={(e) =>
                          updateVariant(v.tempId, {
                            price: e.target.value === "" ? "" : Math.max(0, Number(e.target.value)),
                          })
                        }
                        placeholder="120000"
                      />
                      {typeof v.price === "number" && v.price > 0 && <div className="mt-1 text-[11px] text-gray-500">{currency(Number(v.price))}</div>}
                    </div>
                    <div className="sm:col-span-4">
                      <label className="block text-xs font-medium text-gray-700">Catatan (opsional)</label>
                      <input
                        className="mt-1 w-full rounded-xl bg-gray-100/70 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/20"
                        value={v.notes}
                        onChange={(e) => updateVariant(v.tempId, { notes: e.target.value })}
                        placeholder="Fasilitas, titik kumpul, dll."
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="flex justify-end gap-3">
            <button type="button" className="rounded-xl px-4 py-2 bg-black/5 hover:bg-black/10" onClick={onClose} disabled={submitting}>
              Batal
            </button>
            <button type="submit" className="rounded-xl px-4 py-2 bg-black text-white hover:bg-black/90 disabled:opacity-60" disabled={!canSubmit || submitting}>
              {submitting ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>

      {/* Success */}
      {okOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center">
            <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-700">✓</div>
            <h5 className="text-lg font-semibold">Produk berhasil ditambahkan</h5>
            <button
              className="mt-4 rounded-xl bg-black text-white px-4 py-2 hover:bg-black/90"
              onClick={() => {
                setOkOpen(false);
                onClose();
              }}
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Fail */}
      {failOpen.open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center">
            <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-700">!</div>
            <h5 className="text-lg font-semibold">Gagal menambahkan produk</h5>
            <p className="text-sm text-gray-600 mt-1">{failOpen.message}</p>
            <button className="mt-4 rounded-xl bg-black text-white px-4 py-2 hover:bg-black/90" onClick={() => setFailOpen({ open: false, message: "" })}>
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddProduct;
