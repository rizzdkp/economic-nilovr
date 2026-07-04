const rupiahFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export function formatRupiah(jumlah: number | string): string {
  return rupiahFormatter.format(Number(jumlah));
}

const tanggalFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function formatTanggal(tanggal: Date | string): string {
  return tanggalFormatter.format(new Date(tanggal));
}

const bulanFormatter = new Intl.DateTimeFormat("id-ID", {
  month: "long",
  year: "numeric",
});

export function formatBulan(tanggal: Date | string): string {
  return bulanFormatter.format(new Date(tanggal));
}

export function awalBulan(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

export function akhirBulan(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function tambahBulan(date: Date, jumlahBulan: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + jumlahBulan, 1);
}
