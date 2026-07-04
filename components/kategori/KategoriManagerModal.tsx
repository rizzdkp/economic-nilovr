"use client";

import { useEffect, useState, useCallback } from "react";
import * as TablerIcons from "@tabler/icons-react";
import type { Icon } from "@tabler/icons-react";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { IconPicker } from "@/components/kategori/IconPicker";
import { cn } from "@/lib/cn";

interface Kategori {
  id: string;
  nama: string;
  jenis: "income" | "expense";
  warna: string;
  ikon: string;
  isDefault: boolean;
  disembunyikan: boolean;
}

const PALET_WARNA = ["#3B7A57", "#E07A5F", "#457B9D", "#E76F51", "#9B5DE5", "#2A9D8F", "#F4A261", "#264653", "#E63946", "#6D6875"];

const TABLER_ICON_MAP = TablerIcons as unknown as Record<string, Icon>;

export function KategoriManagerModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [kategori, setKategori] = useState<Kategori[]>([]);
  const [tab, setTab] = useState<"expense" | "income">("expense");
  const [formNama, setFormNama] = useState("");
  const [formWarna, setFormWarna] = useState(PALET_WARNA[0]);
  const [formIkon, setFormIkon] = useState("IconDots");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/kategori");
    const json = await res.json();
    if (json.success) setKategori(json.data);
  }, []);

  useEffect(() => {
    if (!open) return;
    (async () => {
      await load();
    })();
  }, [open, load]);

  function resetForm() {
    setFormNama("");
    setFormWarna(PALET_WARNA[0]);
    setFormIkon("IconDots");
    setEditingId(null);
    setError(null);
  }

  async function handleSubmit() {
    setIsSaving(true);
    setError(null);
    try {
      const res = editingId
        ? await fetch(`/api/kategori/${editingId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nama: formNama, warna: formWarna, ikon: formIkon }),
          })
        : await fetch("/api/kategori", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nama: formNama, jenis: tab, warna: formWarna, ikon: formIkon }),
          });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message ?? "Gagal menyimpan kategori.");
        return;
      }
      resetForm();
      await load();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleHidden(k: Kategori) {
    await fetch(`/api/kategori/${k.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ disembunyikan: !k.disembunyikan }),
    });
    await load();
  }

  async function handleDelete() {
    if (!deletingId) return;
    setIsSaving(true);
    try {
      await fetch(`/api/kategori/${deletingId}`, { method: "DELETE" });
      setDeletingId(null);
      await load();
    } finally {
      setIsSaving(false);
    }
  }

  const filtered = kategori.filter((k) => k.jenis === tab);

  return (
    <Modal open={open} onClose={onClose} title="Kelola kategori">
      <div className="mb-4 flex gap-2 rounded-control border border-border p-1">
        {(["expense", "income"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={cn(
              "flex-1 rounded-control py-2 text-sm font-medium transition-colors duration-150",
              tab === value ? "bg-accent-soft text-accent" : "text-text-secondary",
            )}
          >
            {value === "expense" ? "Pengeluaran" : "Pemasukan"}
          </button>
        ))}
      </div>

      <ul className="flex flex-col gap-2">
        {filtered.map((k) => {
          const IconComp = TABLER_ICON_MAP[k.ikon] ?? TablerIcons.IconDots;
          return (
            <li key={k.id} className="flex items-center gap-3 rounded-control border border-border px-3 py-2">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control text-white"
                style={{ backgroundColor: k.warna }}
              >
                <IconComp size={18} stroke={1.75} />
              </span>
              <span className={cn("flex-1 text-sm text-text-primary", k.disembunyikan && "text-text-secondary line-through")}>
                {k.nama}
              </span>
              {k.isDefault ? (
                <button
                  type="button"
                  onClick={() => handleToggleHidden(k)}
                  className="text-xs font-medium text-text-secondary hover:text-accent"
                >
                  {k.disembunyikan ? "Tampilkan" : "Sembunyikan"}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(k.id);
                      setFormNama(k.nama);
                      setFormWarna(k.warna);
                      setFormIkon(k.ikon);
                    }}
                    className="text-xs font-medium text-text-secondary hover:text-accent"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingId(k.id)}
                    className="text-xs font-medium text-text-secondary hover:text-danger"
                  >
                    Hapus
                  </button>
                </>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
        <Input
          placeholder="Nama kategori baru"
          value={formNama}
          onChange={(e) => setFormNama(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          {PALET_WARNA.map((warna) => (
            <button
              key={warna}
              type="button"
              onClick={() => setFormWarna(warna)}
              aria-label={warna}
              className={cn(
                "h-8 w-8 rounded-full border-2 transition-transform duration-150",
                formWarna === warna ? "scale-110 border-text-primary" : "border-transparent",
              )}
              style={{ backgroundColor: warna }}
            />
          ))}
        </div>
        <IconPicker value={formIkon} onChange={setFormIkon} />
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex gap-2">
          {editingId && (
            <Button type="button" variant="ghost" onClick={resetForm}>
              Batal edit
            </Button>
          )}
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving || formNama.trim().length === 0}
            className="flex-1"
          >
            {editingId ? "Simpan perubahan" : "Tambah kategori"}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={deletingId !== null}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        title="Hapus kategori?"
        description="Transaksi yang masih memakai kategori ini akan dipindahkan ke kategori 'Lainnya'. Tindakan ini tidak bisa dibatalkan."
        confirmLabel="Hapus"
        danger
        isLoading={isSaving}
      />
    </Modal>
  );
}
