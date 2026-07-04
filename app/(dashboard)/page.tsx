import Link from "next/link";
import { getDashboardData } from "@/lib/dashboard-data";
import { DashboardAutoRefresh } from "@/components/dashboard/DashboardAutoRefresh";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { RecentTransactionsList } from "@/components/dashboard/RecentTransactionsList";
import { DompetCard } from "@/components/dompet/DompetCard";
import { TrendChart } from "@/components/chart/TrendChart";
import { CategoryDonutChart } from "@/components/chart/CategoryDonutChart";

// Data dashboard harus selalu segar dari database, jangan di-prerender saat build.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="page-enter flex flex-col gap-6">
      <DashboardAutoRefresh />
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Ringkasan bulan ini</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Saldo, tren, dan aktivitas terbaru semua dompet Anda.
        </p>
      </div>

      <SummaryCards
        totalSaldo={data.totalSaldo}
        pemasukanBulanIni={data.pemasukanBulanIni}
        pengeluaranBulanIni={data.pengeluaranBulanIni}
        persenPemasukanVsBulanLalu={data.persenPemasukanVsBulanLalu}
        persenPengeluaranVsBulanLalu={data.persenPengeluaranVsBulanLalu}
      />

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-text-primary">Dompet</h2>
          <Link href="/dompet" className="text-xs font-medium text-accent hover:underline">
            Kelola dompet
          </Link>
        </div>
        {data.dompet.length === 0 ? (
          <div className="surface-card flex flex-col items-center gap-2 px-6 py-10 text-center">
            <p className="text-sm font-medium text-text-primary">Belum ada dompet</p>
            <p className="text-sm text-text-secondary">
              <Link href="/dompet" className="text-accent hover:underline">
                Tambah dompet pertama Anda
              </Link>{" "}
              untuk mulai mencatat keuangan.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.dompet.map((d) => (
              <Link key={d.id} href={`/transaksi?dompetId=${d.id}`} className="block">
                <DompetCard
                  nama={d.nama}
                  tipe={d.tipe}
                  warna={d.warna}
                  saldoBerjalan={d.saldoBerjalan}
                  diarsipkan={false}
                />
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="surface-card p-5">
          <h2 className="mb-4 text-base font-semibold text-text-primary">Tren 6 bulan terakhir</h2>
          <TrendChart data={data.trend6Bulan} />
        </div>
        <div className="surface-card p-5">
          <h2 className="mb-4 text-base font-semibold text-text-primary">
            Pengeluaran per kategori bulan ini
          </h2>
          <CategoryDonutChart data={data.topKategoriBulanIni} />
        </div>
      </div>

      <RecentTransactionsList rows={data.transaksiTerbaru} />
    </div>
  );
}
