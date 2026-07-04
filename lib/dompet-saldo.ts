import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

export async function getSaldoMap(): Promise<Map<string, Prisma.Decimal>> {
  const [income, expense, transferOut, transferIn] = await Promise.all([
    prisma.transaksi.groupBy({ by: ["dompetId"], where: { jenis: "income" }, _sum: { jumlah: true } }),
    prisma.transaksi.groupBy({ by: ["dompetId"], where: { jenis: "expense" }, _sum: { jumlah: true } }),
    prisma.transaksi.groupBy({ by: ["dompetAsalId"], where: { jenis: "transfer" }, _sum: { jumlah: true } }),
    prisma.transaksi.groupBy({ by: ["dompetTujuanId"], where: { jenis: "transfer" }, _sum: { jumlah: true } }),
  ]);

  const map = new Map<string, Prisma.Decimal>();
  const apply = (id: string | null, amount: Prisma.Decimal | null, sign: 1 | -1) => {
    if (!id || !amount) return;
    const current = map.get(id) ?? new Prisma.Decimal(0);
    map.set(id, sign === 1 ? current.plus(amount) : current.minus(amount));
  };

  income.forEach((r) => apply(r.dompetId, r._sum.jumlah, 1));
  expense.forEach((r) => apply(r.dompetId, r._sum.jumlah, -1));
  transferOut.forEach((r) => apply(r.dompetAsalId, r._sum.jumlah, -1));
  transferIn.forEach((r) => apply(r.dompetTujuanId, r._sum.jumlah, 1));

  return map;
}

export async function getDompetDenganSaldo() {
  const [dompetList, saldoMap] = await Promise.all([
    prisma.dompet.findMany({ orderBy: { dibuatPada: "asc" } }),
    getSaldoMap(),
  ]);

  return dompetList.map((d) => ({
    ...d,
    saldoBerjalan: d.saldoAwal.plus(saldoMap.get(d.id) ?? new Prisma.Decimal(0)),
  }));
}

export async function getTotalSaldoGabungan(): Promise<Prisma.Decimal> {
  const dompetDenganSaldo = await getDompetDenganSaldo();
  return dompetDenganSaldo
    .filter((d) => !d.diarsipkan)
    .reduce((total, d) => total.plus(d.saldoBerjalan), new Prisma.Decimal(0));
}
