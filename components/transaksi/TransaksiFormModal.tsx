"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

interface Option {
  id: string;
  nama: string;
}

export interface TransaksiFormValue {
  id: string;
  jenis: "income" | "expense" | "transfer";
  tanggal: string;
  jumlah: string | number;
  catatan: string | null;
  dompetId: string | null;
  kategoriId: string | null;
  dompetAsalId: string | null;
  dompetTujuanId: string | null;
}

interface TransaksiFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  dompetOptions: Option[];
  kategoriIncomeOptions: Option[];
  kategoriExpenseOptions: Option[];
  transaksi?: TransaksiFormValue | null;
}

function todayInput(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function TransaksiFormModal({
  open,
  onClose,
  onSaved,
  dompetOptions,
  kategoriIncomeOptions,
  kategoriExpenseOptions,
  transaksi,
}: TransaksiFormModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={transaksi ? "Edit transaksi" : "Tambah transaksi"}>
      {open && (
        <TransaksiForm
          key={transaksi?.id ?? "baru"}
          transaksi={transaksi}
          onSaved={onSaved}
          onClose={onClose}
          dompetOptions={dompetOptions}
          kategoriIncomeOptions={kategoriIncomeOptions}
          kategoriExpenseOptions={kategoriExpenseOptions}
        />
      )}
    </Modal>
  );
}

function TransaksiForm({
  transaksi,
  onSaved,
  onClose,
  dompetOptions,
  kategoriIncomeOptions,
  kategoriExpenseOptions,
}: {
  transaksi?: TransaksiFormValue | null;
  onSaved: () => void;
  onClose: () => void;
  dompetOptions: Option[];
  kategoriIncomeOptions: Option[];
  kategoriExpenseOptions: Option[];
}) {
  const [jenis, setJenis] = useState<"income" | "expense" | "transfer">(transaksi?.jenis ?? "expense");
  const [tanggal, setTanggal] = useState(transaksi?.tanggal?.slice(0, 10) ?? todayInput());
  const [jumlah, setJumlah] = useState(transaksi ? String(transaksi.jumlah) : "");
  const [catatan, setCatatan] = useState(transaksi?.catatan ?? "");
  const [dompetId, setDompetId] = useState(transaksi?.dompetId ?? dompetOptions[0]?.id ?? "");
  const [kategoriId, setKategoriId] = useState(transaksi?.kategoriId ?? "");
  const [dompetAsalId, setDompetAsalId] = useState(transaksi?.dompetAsalId ?? dompetOptions[0]?.id ?? "");
  const [dompetTujuanId, setDompetTujuanId] = useState(
    transaksi?.dompetTujuanId ?? dompetOptions[1]?.id ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const kategoriOptions = jenis === "income" ? kategoriIncomeOptions : kategoriExpenseOptions;

  async function handleSubmit() {
    setIsSaving(true);
    setError(null);
    try {
      const payload =
        jenis === "transfer"
          ? { jenis, tanggal, jumlah: Number(jumlah), catatan: catatan || null, dompetAsalId, dompetTujuanId }
          : { jenis, tanggal, jumlah: Number(jumlah), catatan: catatan || null, dompetId, kategoriId };

      const res = transaksi
        ? await fetch(`/api/transaksi/${transaksi.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/transaksi", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message ?? "Gagal menyimpan transaksi.");
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

  const submitDisabled =
    isSaving ||
    jumlah.trim().length === 0 ||
    Number(jumlah) <= 0 ||
    (jenis !== "transfer" && (kategoriId === "" || dompetId === "")) ||
    (jenis === "transfer" && (dompetAsalId === "" || dompetTujuanId === "" || dompetAsalId === dompetTujuanId));

  return (
    <div className="flex flex-col gap-4">
      <Select aria-label="Jenis" value={jenis} onChange={(e) => setJenis(e.target.value as typeof jenis)}>
        <option value="expense">Pengeluaran</option>
        <option value="income">Pemasukan</option>
        <option value="transfer">Transfer</option>
      </Select>
      <Input type="date" aria-label="Tanggal" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
      <Input
        type="number"
        min="1"
        placeholder="Jumlah (Rp)"
        value={jumlah}
        onChange={(e) => setJumlah(e.target.value)}
      />

      {jenis === "transfer" ? (
        <>
          <div>
            <p className="mb-1 text-xs font-medium text-text-secondary">Dari dompet</p>
            <Select value={dompetAsalId} onChange={(e) => setDompetAsalId(e.target.value)}>
              {dompetOptions.map((d) => (
                <option key={d.id} value={d.id}>{d.nama}</option>
              ))}
            </Select>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-text-secondary">Ke dompet</p>
            <Select value={dompetTujuanId} onChange={(e) => setDompetTujuanId(e.target.value)}>
              {dompetOptions.map((d) => (
                <option key={d.id} value={d.id} disabled={d.id === dompetAsalId}>
                  {d.nama}
                </option>
              ))}
            </Select>
          </div>
        </>
      ) : (
        <>
          <div>
            <p className="mb-1 text-xs font-medium text-text-secondary">Dompet</p>
            <Select value={dompetId} onChange={(e) => setDompetId(e.target.value)}>
              {dompetOptions.map((d) => (
                <option key={d.id} value={d.id}>{d.nama}</option>
              ))}
            </Select>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-text-secondary">Kategori</p>
            <Select value={kategoriId} onChange={(e) => setKategoriId(e.target.value)}>
              <option value="">Pilih kategori</option>
              {kategoriOptions.map((k) => (
                <option key={k.id} value={k.id}>{k.nama}</option>
              ))}
            </Select>
          </div>
        </>
      )}

      <Input placeholder="Catatan (opsional)" value={catatan} onChange={(e) => setCatatan(e.target.value)} />

      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="button" onClick={handleSubmit} disabled={submitDisabled}>
        {isSaving ? "Menyimpan..." : "Simpan"}
      </Button>
    </div>
  );
}
