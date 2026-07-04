"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/cn";
import type { TipeDompet } from "@/generated/prisma/client";

const PALET_WARNA = ["#3B7A57", "#457B9D", "#E07A5F", "#9B5DE5", "#2A9D8F", "#E76F51"];

interface DompetFormValue {
  id: string;
  nama: string;
  tipe: TipeDompet;
  saldoAwal: string | number;
  warna: string;
}

interface DompetFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  dompet?: DompetFormValue | null;
}

export function DompetFormModal({ open, onClose, onSaved, dompet }: DompetFormModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={dompet ? "Edit dompet" : "Tambah dompet"}>
      {open && (
        <DompetForm key={dompet?.id ?? "baru"} dompet={dompet} onSaved={onSaved} onClose={onClose} />
      )}
    </Modal>
  );
}

function DompetForm({
  dompet,
  onSaved,
  onClose,
}: {
  dompet?: DompetFormValue | null;
  onSaved: () => void;
  onClose: () => void;
}) {
  const [nama, setNama] = useState(dompet?.nama ?? "");
  const [tipe, setTipe] = useState<TipeDompet>(dompet?.tipe ?? "cash");
  const [saldoAwal, setSaldoAwal] = useState(String(dompet?.saldoAwal ?? "0"));
  const [warna, setWarna] = useState(dompet?.warna ?? PALET_WARNA[0]);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit() {
    setIsSaving(true);
    setError(null);
    try {
      const body = JSON.stringify({ nama, tipe, saldoAwal: Number(saldoAwal), warna });
      const res = dompet
        ? await fetch(`/api/dompet/${dompet.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body })
        : await fetch("/api/dompet", { method: "POST", headers: { "Content-Type": "application/json" }, body });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message ?? "Gagal menyimpan dompet.");
        return;
      }
      onSaved();
      onClose();
    } catch {
      setError("Terjadi kesalahan jaringan, coba lagi.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Input placeholder="Nama dompet" value={nama} onChange={(e) => setNama(e.target.value)} autoFocus />
      <Select value={tipe} onChange={(e) => setTipe(e.target.value as TipeDompet)}>
        <option value="cash">Tunai</option>
        <option value="bank">Rekening bank</option>
        <option value="e_wallet">E-wallet</option>
        <option value="lainnya">Lainnya</option>
      </Select>
      <Input
        type="number"
        placeholder="Saldo awal"
        value={saldoAwal}
        onChange={(e) => setSaldoAwal(e.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        {PALET_WARNA.map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => setWarna(w)}
            aria-label={w}
            className={cn(
              "h-8 w-8 rounded-full border-2 transition-transform duration-150",
              warna === w ? "scale-110 border-text-primary" : "border-transparent",
            )}
            style={{ backgroundColor: w }}
          />
        ))}
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="button" onClick={handleSubmit} disabled={isSaving || nama.trim().length === 0}>
        {isSaving ? "Menyimpan..." : "Simpan"}
      </Button>
    </div>
  );
}
