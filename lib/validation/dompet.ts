import { z } from "zod";

export const tipeDompetEnum = z.enum(["cash", "bank", "e_wallet", "lainnya"]);

const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Warna harus format hex, contoh #3B7A57");

export const dompetCreateSchema = z.object({
  nama: z.string().trim().min(1, "Nama dompet wajib diisi").max(50),
  tipe: tipeDompetEnum,
  saldoAwal: z.coerce.number().finite().default(0),
  warna: hexColor.default("#3B7A57"),
});

export const dompetUpdateSchema = z.object({
  nama: z.string().trim().min(1, "Nama dompet wajib diisi").max(50).optional(),
  tipe: tipeDompetEnum.optional(),
  saldoAwal: z.coerce.number().finite().optional(),
  warna: hexColor.optional(),
  diarsipkan: z.boolean().optional(),
});
