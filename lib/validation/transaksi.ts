import { z } from "zod";

export const jenisTransaksiEnum = z.enum(["income", "expense", "transfer"]);

const catatanField = z.string().trim().max(280).optional().nullable();

export const transaksiCreateSchema = z
  .discriminatedUnion("jenis", [
    z.object({
      jenis: z.literal("income"),
      tanggal: z.coerce.date(),
      jumlah: z.coerce.number().positive("Jumlah harus lebih dari 0"),
      catatan: catatanField,
      dompetId: z.string().min(1, "Dompet wajib dipilih"),
      kategoriId: z.string().min(1, "Kategori wajib dipilih"),
    }),
    z.object({
      jenis: z.literal("expense"),
      tanggal: z.coerce.date(),
      jumlah: z.coerce.number().positive("Jumlah harus lebih dari 0"),
      catatan: catatanField,
      dompetId: z.string().min(1, "Dompet wajib dipilih"),
      kategoriId: z.string().min(1, "Kategori wajib dipilih"),
    }),
    z.object({
      jenis: z.literal("transfer"),
      tanggal: z.coerce.date(),
      jumlah: z.coerce.number().positive("Jumlah harus lebih dari 0"),
      catatan: catatanField,
      dompetAsalId: z.string().min(1, "Dompet asal wajib dipilih"),
      dompetTujuanId: z.string().min(1, "Dompet tujuan wajib dipilih"),
    }),
  ])
  .refine(
    (data) => data.jenis !== "transfer" || data.dompetAsalId !== data.dompetTujuanId,
    { message: "Dompet asal dan tujuan tidak boleh sama", path: ["dompetTujuanId"] },
  );

export const transaksiUpdateSchema = transaksiCreateSchema;

export const transaksiFilterSchema = z.object({
  dariTanggal: z.coerce.date().optional(),
  sampaiTanggal: z.coerce.date().optional(),
  dompetId: z.array(z.string()).optional(),
  kategoriId: z.array(z.string()).optional(),
  jenis: jenisTransaksiEnum.optional(),
  cari: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
