import { Prisma } from "@/generated/prisma/client";
import type { transaksiFilterSchema } from "@/lib/validation/transaksi";
import type { z } from "zod";

export type TransaksiFilter = z.infer<typeof transaksiFilterSchema>;

export function buildTransaksiWhere(filter: TransaksiFilter): Prisma.TransaksiWhereInput {
  const where: Prisma.TransaksiWhereInput = {};

  if (filter.dariTanggal || filter.sampaiTanggal) {
    where.tanggal = {
      ...(filter.dariTanggal ? { gte: filter.dariTanggal } : {}),
      ...(filter.sampaiTanggal ? { lte: filter.sampaiTanggal } : {}),
    };
  }

  if (filter.jenis) {
    where.jenis = filter.jenis;
  }

  if (filter.dompetId && filter.dompetId.length > 0) {
    where.OR = [
      { dompetId: { in: filter.dompetId } },
      { dompetAsalId: { in: filter.dompetId } },
      { dompetTujuanId: { in: filter.dompetId } },
    ];
  }

  if (filter.kategoriId && filter.kategoriId.length > 0) {
    where.kategoriId = { in: filter.kategoriId };
  }

  if (filter.cari) {
    where.catatan = { contains: filter.cari, mode: "insensitive" };
  }

  return where;
}
