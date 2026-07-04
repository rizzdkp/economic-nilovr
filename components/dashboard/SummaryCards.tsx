import { IconArrowDownRight, IconArrowUpRight, IconWallet } from "@tabler/icons-react";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/cn";

interface SummaryCardsProps {
  totalSaldo: string;
  pemasukanBulanIni: string;
  pengeluaranBulanIni: string;
  persenPemasukanVsBulanLalu: number | null;
  persenPengeluaranVsBulanLalu: number | null;
}

function PerubahanBadge({ persen, positifBaik }: { persen: number | null; positifBaik: boolean }) {
  if (persen === null) return null;
  const naik = persen >= 0;
  const baik = naik === positifBaik;
  return (
    <span className={cn("flex items-center gap-1 text-xs font-medium", baik ? "text-success" : "text-danger")}>
      {naik ? <IconArrowUpRight size={14} stroke={2} /> : <IconArrowDownRight size={14} stroke={2} />}
      {Math.abs(persen).toFixed(0)}% dari bulan lalu
    </span>
  );
}

export function SummaryCards({
  totalSaldo,
  pemasukanBulanIni,
  pengeluaranBulanIni,
  persenPemasukanVsBulanLalu,
  persenPengeluaranVsBulanLalu,
}: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="glass-card p-6">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-control bg-accent text-white">
          <IconWallet size={20} stroke={1.75} />
        </div>
        <p className="text-xs font-medium text-text-secondary">Total saldo gabungan</p>
        <p className="tabular-nums mt-1 text-2xl font-semibold text-text-primary sm:text-3xl">
          {formatRupiah(totalSaldo)}
        </p>
      </div>
      <div className="glass-card p-6">
        <p className="text-xs font-medium text-text-secondary">Pemasukan bulan ini</p>
        <p className="tabular-nums mt-1 text-xl font-semibold text-success">{formatRupiah(pemasukanBulanIni)}</p>
        <div className="mt-2">
          <PerubahanBadge persen={persenPemasukanVsBulanLalu} positifBaik />
        </div>
      </div>
      <div className="glass-card p-6">
        <p className="text-xs font-medium text-text-secondary">Pengeluaran bulan ini</p>
        <p className="tabular-nums mt-1 text-xl font-semibold text-danger">{formatRupiah(pengeluaranBulanIni)}</p>
        <div className="mt-2">
          <PerubahanBadge persen={persenPengeluaranVsBulanLalu} positifBaik={false} />
        </div>
      </div>
    </div>
  );
}
