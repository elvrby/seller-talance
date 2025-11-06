// app/account/freelance-form/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthGuard } from "@/app/hooks/use-auth-guard";
import { db } from "@/libs/firebase/config";
import {
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";

// ====== Kategori & sub-jasa ======
const SERVICE_GROUPS: Record<string, string[]> = {
  Editing: ["Design", "Video Editor", "Photo Editor", "Illustrator"],
  Programming: ["UI/UX", "Fullstack Development", "SEO Analysis"],
  Writing: ["Copywriting", "Technical Writing", "Translation"],
  Web: ["Frontend", "Backend", "WordPress"],
} as const;

type ServiceCategory = keyof typeof SERVICE_GROUPS;

const ALL_CATEGORIES = Object.keys(SERVICE_GROUPS) as ServiceCategory[];

const MAX_SPECIALTIES = 4; // tag keahlian bebas
const MAX_CATEGORIES = 3; // maksimal kategori dipilih
const MAX_PER_CATEGORY = 3; // maksimal sub-jasa per kategori

export default function FreelanceFormPage() {
  // Wajib login + verified; form ini target onboarding,
  // jadi jangan enforceFreelanceComplete di sini agar tidak loop.
  const { user, checking } = useAuthGuard("/account/verify-email", {
    enforceVerified: true,
    enforceFreelanceComplete: false,
  });
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  // ===== Username =====
  const [username, setUsername] = useState("");
  const [usernameErr, setUsernameErr] = useState<string | null>(null);
  const [checkBusy, setCheckBusy] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);

  // ===== Specialties (tags) =====
  const [specialtyInput, setSpecialtyInput] = useState("");
  const [specialties, setSpecialties] = useState<string[]>([]);

  // ===== Pilihan jasa: kategori & sub-jasa =====
  const emptyByCat = Object.fromEntries(
    ALL_CATEGORIES.map((c) => [c, [] as string[]])
  ) as Record<ServiceCategory, string[]>;
  const [selectedCats, setSelectedCats] = useState<ServiceCategory[]>([]);
  const [servicesByCategory, setServicesByCategory] =
    useState<Record<ServiceCategory, string[]>>(emptyByCat);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Prefill & auto-redirect jika sudah complete
  useEffect(() => {
    if (!user) return;
    const ref = doc(db, "users", user.uid);
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) {
        setLoading(false);
        return;
      }
      const data = snap.data() as any;

      if (data?.onboarding?.freelanceFormCompleted) {
        router.replace("/");
        return;
      }

      if (data?.username) setUsername(String(data.username));
      if (Array.isArray(data?.freelanceProfile?.specialties)) {
        setSpecialties(data.freelanceProfile.specialties);
      }

      // Restore kategori
      if (Array.isArray(data?.freelanceProfile?.serviceCategories)) {
        const cats = (data.freelanceProfile.serviceCategories as string[])
          .filter((c) => ALL_CATEGORIES.includes(c as ServiceCategory))
          .slice(0, MAX_CATEGORIES) as ServiceCategory[];
        setSelectedCats(cats);
      }

      // Restore sub-jasa per kategori
      const byCat = { ...emptyByCat };
      if (
        data?.freelanceProfile?.servicesByCategory &&
        typeof data.freelanceProfile.servicesByCategory === "object"
      ) {
        for (const cat of ALL_CATEGORIES) {
          const arr = data.freelanceProfile.servicesByCategory[cat];
          byCat[cat] = Array.isArray(arr)
            ? arr
                .filter((s: string) => SERVICE_GROUPS[cat].includes(s))
                .slice(0, MAX_PER_CATEGORY)
            : [];
        }
      } else if (Array.isArray(data?.freelanceProfile?.services)) {
        // kompat: dari flat → kelompokkan
        const flat = data.freelanceProfile.services as string[];
        for (const cat of ALL_CATEGORIES) {
          byCat[cat] = flat
            .filter((s) => SERVICE_GROUPS[cat].includes(s))
            .slice(0, MAX_PER_CATEGORY);
        }
      }
      setServicesByCategory(byCat);

      setLoading(false);
    });
    return () => unsub();
  }, [user, router]);

  // ===== Validasi username =====
  const normUsername = useMemo(() => username.trim().toLowerCase(), [username]);
  const usernameValidSyntax = useMemo(
    () => /^[a-z0-9._]{3,20}$/.test(normUsername),
    [normUsername]
  );

  // Debounce cek ketersediaan
  useEffect(() => {
    if (!usernameValidSyntax) {
      setAvailable(null);
      setUsernameErr(
        username.length === 0
          ? null
          : "Gunakan 3–20 karakter: huruf, angka, underscore (_) atau titik (.)"
      );
      return;
    }
    let alive = true;
    setCheckBusy(true);
    setUsernameErr(null);
    const t = setTimeout(async () => {
      try {
        const snap = await getDoc(doc(db, "usernames", normUsername));
        if (!alive) return;
        const used = snap.exists() && snap.data()?.uid !== user?.uid;
        setAvailable(!used);
        setUsernameErr(used ? "Username sudah dipakai." : null);
      } catch (e: any) {
        if (!alive) return;
        if (e?.code === "permission-denied") {
          setUsernameErr("Akses ditolak. Cek Rules koleksi 'usernames'.");
        } else {
          setUsernameErr("Gagal mengecek username.");
        }
        setAvailable(null);
      } finally {
        if (alive) setCheckBusy(false);
      }
    }, 400);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [normUsername, usernameValidSyntax, user?.uid, username.length]);

  // ===== Specialty handlers =====
  const addSpecialty = (raw: string) => {
    const v = raw.trim();
    if (!v) return;
    const clean = v
      .replace(/[^a-zA-Z0-9\s&\-]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!clean) return;
    if (specialties.includes(clean)) return;
    if (specialties.length >= MAX_SPECIALTIES) return;
    setSpecialties((s) => [...s, clean]);
    setSpecialtyInput("");
  };
  const removeSpecialty = (name: string) => {
    setSpecialties((s) => s.filter((x) => x !== name));
  };

  // ===== Category picker =====
  const availableCats = useMemo(
    () => ALL_CATEGORIES.filter((c) => !selectedCats.includes(c)),
    [selectedCats]
  );
  const addCategory = (c: ServiceCategory) => {
    if (selectedCats.length >= MAX_CATEGORIES) return;
    if (selectedCats.includes(c)) return;
    setSelectedCats((s) => [...s, c]);
  };
  const removeCategory = (c: ServiceCategory) => {
    setSelectedCats((s) => s.filter((x) => x !== c));
    // hapus sub-jasa kategori tsb juga
    setServicesByCategory((prev) => ({ ...prev, [c]: [] }));
  };

  // ===== Toggle sub-jasa di kategori (maks 3 per kategori) =====
  const toggleSubService = (cat: ServiceCategory, svc: string) => {
    setServicesByCategory((prev) => {
      const cur = prev[cat] ?? [];
      const checked = cur.includes(svc);
      if (checked) {
        return { ...prev, [cat]: cur.filter((x) => x !== svc) };
      }
      if (cur.length >= MAX_PER_CATEGORY) return prev;
      return { ...prev, [cat]: [...cur, svc] };
    });
  };

  // Flat services untuk disimpan juga (memudahkan query)
  const flatServices = useMemo(
    () => selectedCats.flatMap((c) => servicesByCategory[c] ?? []),
    [selectedCats, servicesByCategory]
  );

  const canSubmit =
    !!user &&
    usernameValidSyntax &&
    available === true &&
    specialties.length > 0 &&
    specialties.length <= MAX_SPECIALTIES &&
    selectedCats.length > 0 &&
    selectedCats.length <= MAX_CATEGORIES &&
    flatServices.length > 0; // minimal ada 1 sub-jasa dipilih

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !canSubmit) return;

    setLoading(true);
    try {
      await runTransaction(db, async (tx) => {
        const usernameRef = doc(db, "usernames", normUsername);
        const userRef = doc(db, "users", user.uid);

        const usernameSnap = await tx.get(usernameRef);
        if (usernameSnap.exists()) {
          const owner = usernameSnap.data()?.uid;
          if (owner !== user.uid) throw new Error("USERNAME_TAKEN");
          // kalau sudah milik user ini → lanjut update
        } else {
          tx.set(usernameRef, { uid: user.uid, createdAt: serverTimestamp() });
        }

        tx.set(
          userRef,
          {
            uid: user.uid,
            username: normUsername,
            freelanceProfile: {
              specialties,
              serviceCategories: selectedCats, // maks 3 kategori
              servicesByCategory, // map kategori → sub-jasa (maks 3/kat)
              services: flatServices, // flat gabungan
              completedAt: serverTimestamp(),
            },
            roles: { freelancer: true },
            onboarding: { freelanceFormCompleted: true },
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      });

      router.replace("/");
    } catch (err: any) {
      if (err?.message === "USERNAME_TAKEN") {
        setUsernameErr("Username sudah dipakai.");
      } else if (err?.code === "permission-denied") {
        setUsernameErr("Akses ditolak oleh Firestore Rules saat menyimpan.");
      } else {
        setUsernameErr("Gagal menyimpan. Coba lagi.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (checking || !user || loading) {
    return (
      <main className="grid min-h-[calc(100vh-64px)] place-items-center text-sm text-gray-500">
        Memuat formulir…
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-64px)] bg-white">
      <div className="mx-auto max-w-xl px-4 py-8">
        <h1 className="text-2xl font-semibold text-gray-900">
          Lengkapi Profil Freelancer
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Buat username unik, pilih keahlian (maks {MAX_SPECIALTIES}) dan
          kategori jasa (maks {MAX_CATEGORIES}). Untuk tiap kategori, pilih
          sub-jasa (maks {MAX_PER_CATEGORY}).
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-6">
          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Username <span className="text-gray-400">(huruf/angka/_/.)</span>
            </label>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-gray-400">@</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                placeholder="misal: johndoe.dev"
                className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-gray-900 outline-none focus:border-gray-900"
                autoComplete="off"
              />
              {checkBusy ? (
                <span className="text-xs text-gray-500">cek…</span>
              ) : available === true ? (
                <span className="text-xs text-emerald-600">tersedia</span>
              ) : available === false ? (
                <span className="text-xs text-red-600">dipakai</span>
              ) : null}
            </div>
            {usernameErr && (
              <p className="mt-1 text-sm text-red-600">{usernameErr}</p>
            )}
          </div>

          {/* Specialties (tags, max 4) */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Keahlian (maks {MAX_SPECIALTIES})
            </label>
            <div className="mt-1 rounded-xl border border-gray-300 px-2 py-2">
              <div className="flex flex-wrap gap-2">
                {specialties.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm"
                  >
                    {s}
                    <button
                      type="button"
                      className="text-gray-500 hover:text-gray-700"
                      onClick={() => removeSpecialty(s)}
                      aria-label={`Hapus ${s}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
                {specialties.length < MAX_SPECIALTIES && (
                  <input
                    value={specialtyInput}
                    onChange={(e) => setSpecialtyInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        addSpecialty(specialtyInput);
                      }
                    }}
                    placeholder="contoh: Web Development"
                    className="min-w-[12ch] flex-1 px-2 py-1 outline-none"
                  />
                )}
              </div>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Tekan Enter untuk menambahkan. Contoh: Web Development, Design,
              Photography.
            </p>
          </div>

          {/* Service Categories (max 3) + sub-jasa (max 3/kategori) */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Kategori Jasa
            </label>

            {/* Chips kategori terpilih + tombol tambah */}
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedCats.map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm"
                >
                  {c}
                  <button
                    type="button"
                    className="text-gray-500 hover:text-gray-700"
                    onClick={() => removeCategory(c)}
                    aria-label={`Hapus ${c}`}
                  >
                    ×
                  </button>
                </span>
              ))}

              <button
                type="button"
                disabled={selectedCats.length >= MAX_CATEGORIES}
                onClick={() => setPickerOpen((v) => !v)}
                className="inline-flex items-center rounded-xl border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 disabled:opacity-50"
              >
                + Tambah Jasa
              </button>
            </div>

            {/* Picker kategori */}
            {pickerOpen && (
              <div className="mt-2 rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
                {ALL_CATEGORIES.filter((c) => !selectedCats.includes(c))
                  .length === 0 ? (
                  <div className="px-2 py-1 text-sm text-gray-500">
                    Semua kategori sudah dipilih.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {ALL_CATEGORIES.filter(
                      (c) => !selectedCats.includes(c)
                    ).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          addCategory(c);
                          if (selectedCats.length + 1 >= MAX_CATEGORIES)
                            setPickerOpen(false);
                        }}
                        className="rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50"
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}
                <div className="mt-2 text-right">
                  <button
                    type="button"
                    onClick={() => setPickerOpen(false)}
                    className="text-sm text-gray-700 underline underline-offset-4 hover:text-gray-900"
                  >
                    Selesai
                  </button>
                </div>
              </div>
            )}

            {/* Panel sub-jasa tiap kategori terpilih */}
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {selectedCats.map((cat) => {
                const picked = servicesByCategory[cat] ?? [];
                const options = SERVICE_GROUPS[cat];
                return (
                  <div
                    key={cat}
                    className="rounded-xl border border-gray-200 p-3"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-sm font-medium text-gray-900">
                        {cat}
                      </div>
                      <div className="text-xs text-gray-500">
                        {picked.length}/{MAX_PER_CATEGORY}
                      </div>
                    </div>

                    <div className="space-y-1">
                      {options.map((svc) => {
                        const checked = picked.includes(svc);
                        const disabled =
                          !checked && picked.length >= MAX_PER_CATEGORY;
                        return (
                          <label
                            key={svc}
                            className={`flex items-center gap-2 text-sm ${
                              disabled ? "opacity-50" : ""
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={disabled}
                              onChange={() => toggleSubService(cat, svc)}
                              className="h-4 w-4"
                            />
                            <span>{svc}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => router.replace("/")}
              className="rounded-xl border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-100"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={!canSubmit || loading}
              className="rounded-xl bg-gray-900 px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-60"
            >
              {loading ? "Menyimpan…" : "Simpan & Lanjut"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
