"use client";

import { useCallback, useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { TrendChart } from "@/components/chart/TrendChart";
import { CategoryDonutChart } from "@/components/chart/CategoryDonutChart";
import { WalletBarChart } from "@/components/chart/WalletBarChart";
import { fetchTrend, fetchBreakdownBulanIni, fetchBreakdownDompet } from "@/lib/actions/laporan";
import { useAutoRefresh } from "@/lib/use-auto-refresh";
import { cn } from "@/lib/cn";

type TrendPoint = { bulan: string; pemasukan: number; pengeluaran: number };
type BreakdownPoint = { nama: string; warna: string; total: number; persen: number };
type WalletPoint = { nama: string; warna: string; saldo: number };

export default function LaporanPage() {
  const [bulanRange, setBulanRange] = useState<3 | 6 | 12>(6);
  const [trend, setTrend] = useState<TrendPoint[] | null>(null);
  const [breakdown, setBreakdown] = useState<BreakdownPoint[] | null>(null);
  const [walletChart, setWalletChart] = useState<WalletPoint[] | null>(null);

  const reload = useCallback(async () => {
    const [trendData, breakdownData, walletData] = await Promise.all([
      fetchTrend(bulanRange),
      fetchBreakdownBulanIni(),
      fetchBreakdownDompet(),
    ]);
    setTrend(trendData);
    setBreakdown(breakdownData);
    setWalletChart(walletData);
  }, [bulanRange]);

  useEffect(() => {
    (async () => {
      await reload();
    })();
  }, [reload]);

  useAutoRefresh(reload);

  return (
    <div className="page-enter flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Laporan</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Tren dan rincian keuangan Anda dari waktu ke waktu.
        </p>
      </div>

      <div className="surface-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-text-primary">Tren pemasukan vs pengeluaran</h2>
          <div className="flex gap-1 rounded-control border border-border p-1">
            {([3, 6, 12] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setBulanRange(value)}
                className={cn(
                  "min-h-8 rounded-control px-3 text-xs font-medium transition-colors duration-150",
                  bulanRange === value ? "bg-accent-soft text-accent" : "text-text-secondary",
                )}
              >
                {value} bulan
              </button>
            ))}
          </div>
        </div>
        {trend === null ? <Skeleton className="h-64" /> : <TrendChart data={trend} />}
      </div>

      <div className="surface-card p-5">
        <h2 className="mb-4 text-base font-semibold text-text-primary">
          Pengeluaran per kategori (bulan ini)
        </h2>
        {breakdown === null ? <Skeleton className="h-48" /> : <CategoryDonutChart data={breakdown} />}
      </div>

      <div className="surface-card p-5">
        <h2 className="mb-4 text-base font-semibold text-text-primary">
          Perbandingan saldo antar dompet
        </h2>
        {walletChart === null ? <Skeleton className="h-48" /> : <WalletBarChart data={walletChart} />}
      </div>
    </div>
  );
}
