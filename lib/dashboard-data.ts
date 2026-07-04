import { prisma } from "@/lib/prisma";
import { getDompetDenganSaldo, getTotalSaldoGabungan } from "@/lib/dompet-saldo";
import { awalBulan, akhirBulan, tambahBulan, formatBulan } from "@/lib/format";

async function sumJenis(jenis: "income" | "expense", dari: Date, sampai: Date): Promise<number> {
  const result = await prisma.transaksi.aggregate({
    where: { jenis, tanggal: { gte: dari, lte: sampai } },
    _sum: { jumlah: true },
  });
  return Number(result._sum.jumlah ?? 0);
}

function persenPerubahan(sekarang: number, lalu: number): number | null {
  if (lalu === 0) return null;
  return ((sekarang - lalu) / lalu) * 100;
}

export async function getDashboardData() {
  const now = new Date();
  const bulanIniAwal = awalBulan(now);
  const bulanIniAkhir = akhirBulan(now);
  const bulanLalu = tambahBulan(now, -1);
  const bulanLaluAwal = awalBulan(bulanLalu);
  const bulanLaluAkhir = akhirBulan(bulanLalu);

  const [
    totalSaldo,
    dompetDenganSaldo,
    pemasukanBulanIni,
    pengeluaranBulanIni,
    pemasukanBulanLalu,
    pengeluaranBulanLalu,
    transaksiTerbaru,
  ] = await Promise.all([
    getTotalSaldoGabungan(),
    getDompetDenganSaldo(),
    sumJenis("income", bulanIniAwal, bulanIniAkhir),
    sumJenis("expense", bulanIniAwal, bulanIniAkhir),
    sumJenis("income", bulanLaluAwal, bulanLaluAkhir),
    sumJenis("expense", bulanLaluAwal, bulanLaluAkhir),
    prisma.transaksi.findMany({
      include: { dompet: true, dompetAsal: true, dompetTujuan: true, kategori: true },
      orderBy: [{ tanggal: "desc" }, { dibuatPada: "desc" }],
      take: 5,
    }),
  ]);

  const trend6Bulan = await Promise.all(
    Array.from({ length: 6 }, (_, index) => {
      const bulan = tambahBulan(now, index - 5);
      return Promise.all([
        sumJenis("income", awalBulan(bulan), akhirBulan(bulan)),
        sumJenis("expense", awalBulan(bulan), akhirBulan(bulan)),
      ]).then(([pemasukan, pengeluaran]) => ({
        bulan: formatBulan(bulan),
        pemasukan,
        pengeluaran,
      }));
    }),
  );

  const breakdownRaw = await prisma.transaksi.groupBy({
    by: ["kategoriId"],
    where: {
      jenis: "expense",
      tanggal: { gte: bulanIniAwal, lte: bulanIniAkhir },
      kategoriId: { not: null },
    },
    _sum: { jumlah: true },
    orderBy: { _sum: { jumlah: "desc" } },
    take: 5,
  });
  const kategoriIds = breakdownRaw
    .map((r) => r.kategoriId)
    .filter((id): id is string => id !== null);
  const kategoriList = await prisma.kategori.findMany({ where: { id: { in: kategoriIds } } });
  const totalPengeluaranBulanIni = pengeluaranBulanIni || 1;
  const topKategoriBulanIni = breakdownRaw.map((r) => {
    const kategori = kategoriList.find((k) => k.id === r.kategoriId);
    const total = Number(r._sum.jumlah ?? 0);
    return {
      nama: kategori?.nama ?? "Lainnya",
      warna: kategori?.warna ?? "#6B6A64",
      total,
      persen: (total / totalPengeluaranBulanIni) * 100,
    };
  });

  return {
    totalSaldo: totalSaldo.toString(),
    pemasukanBulanIni: String(pemasukanBulanIni),
    pengeluaranBulanIni: String(pengeluaranBulanIni),
    persenPemasukanVsBulanLalu: persenPerubahan(pemasukanBulanIni, pemasukanBulanLalu),
    persenPengeluaranVsBulanLalu: persenPerubahan(pengeluaranBulanIni, pengeluaranBulanLalu),
    dompet: dompetDenganSaldo
      .filter((d) => !d.diarsipkan)
      .map((d) => ({
        id: d.id,
        nama: d.nama,
        warna: d.warna,
        tipe: d.tipe,
        saldoBerjalan: d.saldoBerjalan.toString(),
      })),
    trend6Bulan,
    topKategoriBulanIni,
    transaksiTerbaru: transaksiTerbaru.map((t) => ({
      id: t.id,
      tanggal: t.tanggal.toISOString(),
      jumlah: t.jumlah.toString(),
      jenis: t.jenis,
      catatan: t.catatan,
      dompet: t.dompet ? { nama: t.dompet.nama } : null,
      dompetAsal: t.dompetAsal ? { nama: t.dompetAsal.nama } : null,
      dompetTujuan: t.dompetTujuan ? { nama: t.dompetTujuan.nama } : null,
      kategori: t.kategori ? { nama: t.kategori.nama } : null,
    })),
  };
}
