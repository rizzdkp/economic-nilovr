import { prisma } from "@/lib/prisma";
import { getDompetDenganSaldo } from "@/lib/dompet-saldo";
import { awalBulan, akhirBulan, tambahBulan, formatBulan } from "@/lib/format";

async function sumJenis(jenis: "income" | "expense", dari: Date, sampai: Date): Promise<number> {
  const result = await prisma.transaksi.aggregate({
    where: { jenis, tanggal: { gte: dari, lte: sampai } },
    _sum: { jumlah: true },
  });
  return Number(result._sum.jumlah ?? 0);
}

export async function getTrendData(bulanRange: 3 | 6 | 12) {
  const now = new Date();
  return Promise.all(
    Array.from({ length: bulanRange }, (_, index) => {
      const bulan = tambahBulan(now, index - (bulanRange - 1));
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
}

export async function getBreakdownKategori(dari: Date, sampai: Date) {
  const breakdownRaw = await prisma.transaksi.groupBy({
    by: ["kategoriId"],
    where: { jenis: "expense", tanggal: { gte: dari, lte: sampai }, kategoriId: { not: null } },
    _sum: { jumlah: true },
    orderBy: { _sum: { jumlah: "desc" } },
  });

  const kategoriIds = breakdownRaw
    .map((r) => r.kategoriId)
    .filter((id): id is string => id !== null);
  const kategoriList = await prisma.kategori.findMany({ where: { id: { in: kategoriIds } } });
  const totalPengeluaran = breakdownRaw.reduce((sum, r) => sum + Number(r._sum.jumlah ?? 0), 0) || 1;

  return breakdownRaw.map((r) => {
    const kategori = kategoriList.find((k) => k.id === r.kategoriId);
    const total = Number(r._sum.jumlah ?? 0);
    return {
      nama: kategori?.nama ?? "Lainnya",
      warna: kategori?.warna ?? "#6B6A64",
      total,
      persen: (total / totalPengeluaran) * 100,
    };
  });
}

export async function getBreakdownDompet() {
  const dompetDenganSaldo = await getDompetDenganSaldo();
  return dompetDenganSaldo
    .filter((d) => !d.diarsipkan)
    .map((d) => ({ nama: d.nama, warna: d.warna, saldo: Number(d.saldoBerjalan) }));
}
