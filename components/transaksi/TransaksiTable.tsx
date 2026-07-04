"use client";

import { formatRupiah, formatTanggal } from "@/lib/format";
import { cn } from "@/lib/cn";

export interface TransaksiRow {
  id: string;
  tanggal: string;
  jumlah: string | number;
  jenis: "income" | "expense" | "transfer";
  catatan: string | null;
  dompetId: string | null;
  kategoriId: string | null;
  dompetAsalId: string | null;
  dompetTujuanId: string | null;
  dompet: { nama: string } | null;
  dompetAsal: { nama: string } | null;
  dompetTujuan: { nama: string } | null;
  kategori: { nama: string } | null;
}

function keterangan(row: TransaksiRow): string {
  if (row.jenis === "transfer") {
    return `Transfer: ${row.dompetAsal?.nama ?? "-"} → ${row.dompetTujuan?.nama ?? "-"}`;
  }
  return row.kategori?.nama ?? "-";
}

function jumlahClass(jenis: TransaksiRow["jenis"]): string {
  if (jenis === "income") return "text-success";
  if (jenis === "expense") return "text-danger";
  return "text-text-primary";
}

function jumlahPrefix(jenis: TransaksiRow["jenis"]): string {
  if (jenis === "income") return "+";
  if (jenis === "expense") return "-";
  return "";
}

interface TransaksiTableProps {
  rows: TransaksiRow[];
  onEdit: (row: TransaksiRow) => void;
  onDelete: (row: TransaksiRow) => void;
}

export function TransaksiTable({ rows, onEdit, onDelete }: TransaksiTableProps) {
  if (rows.length === 0) {
    return (
      <div className="surface-card flex flex-col items-center gap-2 px-6 py-12 text-center">
        <p className="text-sm font-medium text-text-primary">Tidak ada transaksi</p>
        <p className="text-sm text-text-secondary">
          Coba ubah filter, atau catat transaksi pertama Anda lewat tombol di atas.
        </p>
      </div>
    );
  }

  return (
    <div className="surface-card overflow-hidden">
      <table className="hidden w-full md:table">
        <thead>
          <tr className="border-b border-border text-left text-xs font-medium text-text-secondary">
            <th className="px-4 py-3 font-medium">Tanggal</th>
            <th className="px-4 py-3 font-medium">Keterangan</th>
            <th className="px-4 py-3 font-medium">Dompet</th>
            <th className="px-4 py-3 text-right font-medium">Jumlah</th>
            <th className="px-4 py-3 text-right font-medium">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border last:border-0">
              <td className="px-4 py-3 text-sm text-text-secondary">{formatTanggal(row.tanggal)}</td>
              <td className="px-4 py-3 text-sm text-text-primary">
                {keterangan(row)}
                {row.catatan && <span className="block text-xs text-text-secondary">{row.catatan}</span>}
              </td>
              <td className="px-4 py-3 text-sm text-text-secondary">{row.dompet?.nama ?? "-"}</td>
              <td className={cn("tabular-nums px-4 py-3 text-right text-sm font-medium", jumlahClass(row.jenis))}>
                {jumlahPrefix(row.jenis)}
                {formatRupiah(row.jumlah)}
              </td>
              <td className="px-4 py-3 text-right text-xs">
                <button
                  type="button"
                  onClick={() => onEdit(row)}
                  className="mr-3 font-medium text-text-secondary hover:text-accent"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(row)}
                  className="font-medium text-text-secondary hover:text-danger"
                >
                  Hapus
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex flex-col divide-y divide-border md:hidden">
        {rows.map((row) => (
          <div key={row.id} className="flex flex-col gap-1 px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-text-primary">{keterangan(row)}</span>
              <span className={cn("tabular-nums shrink-0 text-sm font-medium", jumlahClass(row.jenis))}>
                {jumlahPrefix(row.jenis)}
                {formatRupiah(row.jumlah)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-text-secondary">
              <span>
                {formatTanggal(row.tanggal)}
                {row.dompet?.nama ? ` · ${row.dompet.nama}` : ""}
              </span>
              <span className="flex gap-3">
                <button type="button" onClick={() => onEdit(row)} className="min-h-11 font-medium hover:text-accent">
                  Edit
                </button>
                <button type="button" onClick={() => onDelete(row)} className="min-h-11 font-medium hover:text-danger">
                  Hapus
                </button>
              </span>
            </div>
            {row.catatan && <span className="text-xs text-text-secondary">{row.catatan}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
