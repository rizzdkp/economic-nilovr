import Link from "next/link";
import { formatRupiah, formatTanggal } from "@/lib/format";
import { cn } from "@/lib/cn";

interface Row {
  id: string;
  tanggal: string;
  jumlah: string | number;
  jenis: "income" | "expense" | "transfer";
  catatan: string | null;
  dompet: { nama: string } | null;
  dompetAsal: { nama: string } | null;
  dompetTujuan: { nama: string } | null;
  kategori: { nama: string } | null;
}

export function RecentTransactionsList({ rows }: { rows: Row[] }) {
  return (
    <div className="surface-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-text-primary">Transaksi terbaru</h2>
        <Link href="/transaksi" className="text-xs font-medium text-accent hover:underline">
          Lihat semua
        </Link>
      </div>
      <ul className="flex flex-col divide-y divide-border">
        {rows.length === 0 && <li className="py-4 text-sm text-text-secondary">Belum ada transaksi.</li>}
        {rows.map((row) => {
          const keterangan =
            row.jenis === "transfer"
              ? `Transfer: ${row.dompetAsal?.nama ?? "-"} → ${row.dompetTujuan?.nama ?? "-"}`
              : (row.kategori?.nama ?? "-");
          const jumlahClass =
            row.jenis === "income" ? "text-success" : row.jenis === "expense" ? "text-danger" : "text-text-primary";
          const prefix = row.jenis === "income" ? "+" : row.jenis === "expense" ? "-" : "";
          return (
            <li key={row.id} className="flex items-center justify-between gap-2 py-3 text-sm">
              <span>
                <span className="block text-text-primary">{keterangan}</span>
                <span className="block text-xs text-text-secondary">
                  {formatTanggal(row.tanggal)}
                  {row.dompet?.nama ? ` · ${row.dompet.nama}` : ""}
                </span>
              </span>
              <span className={cn("tabular-nums shrink-0 font-medium", jumlahClass)}>
                {prefix}
                {formatRupiah(row.jumlah)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
