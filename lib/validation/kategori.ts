import { z } from "zod";

export const jenisKategoriEnum = z.enum(["income", "expense"]);

export const kategoriCreateSchema = z.object({
  nama: z.string().trim().min(1, "Nama kategori wajib diisi").max(40),
  jenis: jenisKategoriEnum,
  warna: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Warna harus format hex"),
  ikon: z.string().min(1, "Ikon wajib dipilih"),
});

export const kategoriUpdateSchema = z.object({
  nama: z.string().trim().min(1).max(40).optional(),
  warna: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  ikon: z.string().min(1).optional(),
  disembunyikan: z.boolean().optional(),
});
