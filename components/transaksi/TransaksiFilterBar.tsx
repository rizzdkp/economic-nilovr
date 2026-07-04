"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { MultiSelectChips } from "@/components/ui/MultiSelectChips";
import { KategoriManagerModal } from "@/components/kategori/KategoriManagerModal";
import { awalBulan, akhirBulan, tambahBulan } from "@/lib/format";

export interface TransaksiFilterState {
  dariTanggal: string;
  sampaiTanggal: string;
  jenis: "" | "income" | "expense" | "transfer";
  dompetId: string[];
  kategoriId: string[];
  cari: string;
}

interface TransaksiFilterBarProps {
  filter: TransaksiFilterState;
  onChange: (next: TransaksiFilterState) => void;
  dompetOptions: { value: string; label: string }[];
  kategoriOptions: { value: string; label: string }[];
  onKategoriChanged: () => void;
}

function toDateInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function TransaksiFilterBar({
  filter,
  onChange,
  dompetOptions,
  kategoriOptions,
  onKategoriChanged,
}: TransaksiFilterBarProps) {
  const [kategoriModalOpen, setKategoriModalOpen] = useState(false);

  function applyPreset(preset: "bulanIni" | "bulanLalu" | "tigaBulan") {
    const now = new Date();
    if (preset === "bulanIni") {
      onChange({ ...filter, dariTanggal: toDateInput(awalBulan(now)), sampaiTanggal: toDateInput(akhirBulan(now)) });
    } else if (preset === "bulanLalu") {
      const lalu = tambahBulan(now, -1);
      onChange({ ...filter, dariTanggal: toDateInput(awalBulan(lalu)), sampaiTanggal: toDateInput(akhirBulan(lalu)) });
    } else {
      const tigaBulanLalu = tambahBulan(now, -2);
      onChange({ ...filter, dariTanggal: toDateInput(awalBulan(tigaBulanLalu)), sampaiTanggal: toDateInput(akhirBulan(now)) });
    }
  }

  return (
    <div className="surface-card flex flex-col gap-4 p-4">
      <div className="flex flex-wrap gap-2">
        {[
          { key: "bulanIni" as const, label: "Bulan ini" },
          { key: "bulanLalu" as const, label: "Bulan lalu" },
          { key: "tigaBulan" as const, label: "3 bulan terakhir" },
        ].map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => applyPreset(p.key)}
            className="min-h-9 rounded-control border border-border px-3 text-sm font-medium text-text-secondary transition-colors duration-150 hover:bg-accent-soft"
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Input
          type="date"
          aria-label="Dari tanggal"
          value={filter.dariTanggal}
          onChange={(e) => onChange({ ...filter, dariTanggal: e.target.value })}
        />
        <Input
          type="date"
          aria-label="Sampai tanggal"
          value={filter.sampaiTanggal}
          onChange={(e) => onChange({ ...filter, sampaiTanggal: e.target.value })}
        />
        <Select
          aria-label="Jenis transaksi"
          value={filter.jenis}
          onChange={(e) => onChange({ ...filter, jenis: e.target.value as TransaksiFilterState["jenis"] })}
        >
          <option value="">Semua jenis</option>
          <option value="income">Pemasukan</option>
          <option value="expense">Pengeluaran</option>
          <option value="transfer">Transfer</option>
        </Select>
        <Input
          placeholder="Cari catatan..."
          value={filter.cari}
          onChange={(e) => onChange({ ...filter, cari: e.target.value })}
        />
      </div>

      {dompetOptions.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium text-text-secondary">Dompet</p>
          <MultiSelectChips
            options={dompetOptions}
            value={filter.dompetId}
            onChange={(v) => onChange({ ...filter, dompetId: v })}
          />
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium text-text-secondary">Kategori</p>
          <button
            type="button"
            onClick={() => setKategoriModalOpen(true)}
            className="text-xs font-medium text-accent hover:underline"
          >
            Kelola kategori
          </button>
        </div>
        <MultiSelectChips
          options={kategoriOptions}
          value={filter.kategoriId}
          onChange={(v) => onChange({ ...filter, kategoriId: v })}
        />
      </div>

      <KategoriManagerModal
        open={kategoriModalOpen}
        onClose={() => {
          setKategoriModalOpen(false);
          onKategoriChanged();
        }}
      />
    </div>
  );
}
