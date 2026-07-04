import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const kategoriExpenseDefault = [
  { nama: "Makanan & minuman", warna: "#E07A5F", ikon: "IconToolsKitchen2" },
  { nama: "Transportasi", warna: "#457B9D", ikon: "IconCar" },
  { nama: "Tagihan & utilitas", warna: "#6D6875", ikon: "IconFileInvoice" },
  { nama: "Belanja", warna: "#E76F51", ikon: "IconShoppingBag" },
  { nama: "Kesehatan", warna: "#E63946", ikon: "IconHeartbeat" },
  { nama: "Hiburan", warna: "#9B5DE5", ikon: "IconMovie" },
  { nama: "Pendidikan", warna: "#2A9D8F", ikon: "IconBook" },
  { nama: "Lainnya", warna: "#6B6A64", ikon: "IconDots" },
];

const kategoriIncomeDefault = [
  { nama: "Gaji", warna: "#2E7D5B", ikon: "IconWallet" },
  { nama: "Bonus", warna: "#F4A261", ikon: "IconGift" },
  { nama: "Hasil usaha", warna: "#3B7A57", ikon: "IconBriefcase" },
  { nama: "Investasi", warna: "#264653", ikon: "IconChartLine" },
  { nama: "Lainnya", warna: "#6B6A64", ikon: "IconDots" },
];

async function main() {
  for (const k of kategoriExpenseDefault) {
    await prisma.kategori.upsert({
      where: { nama_jenis: { nama: k.nama, jenis: "expense" } },
      update: {},
      create: { ...k, jenis: "expense", isDefault: true },
    });
  }

  for (const k of kategoriIncomeDefault) {
    await prisma.kategori.upsert({
      where: { nama_jenis: { nama: k.nama, jenis: "income" } },
      update: {},
      create: { ...k, jenis: "income", isDefault: true },
    });
  }

  console.log("Seed kategori default selesai.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
