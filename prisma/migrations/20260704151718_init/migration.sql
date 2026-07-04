-- CreateEnum
CREATE TYPE "TipeDompet" AS ENUM ('cash', 'bank', 'e_wallet', 'lainnya');

-- CreateEnum
CREATE TYPE "JenisKategori" AS ENUM ('income', 'expense');

-- CreateEnum
CREATE TYPE "JenisTransaksi" AS ENUM ('income', 'expense', 'transfer');

-- CreateTable
CREATE TABLE "Dompet" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "tipe" "TipeDompet" NOT NULL,
    "saldoAwal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "warna" TEXT NOT NULL DEFAULT '#3B7A57',
    "diarsipkan" BOOLEAN NOT NULL DEFAULT false,
    "dibuatPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dompet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kategori" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "jenis" "JenisKategori" NOT NULL,
    "warna" TEXT NOT NULL,
    "ikon" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "disembunyikan" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Kategori_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaksi" (
    "id" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "jumlah" DECIMAL(14,2) NOT NULL,
    "jenis" "JenisTransaksi" NOT NULL,
    "catatan" TEXT,
    "dompetId" TEXT,
    "dompetAsalId" TEXT,
    "dompetTujuanId" TEXT,
    "kategoriId" TEXT,
    "dibuatPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaksi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Kategori_nama_jenis_key" ON "Kategori"("nama", "jenis");

-- CreateIndex
CREATE INDEX "Transaksi_tanggal_idx" ON "Transaksi"("tanggal");

-- CreateIndex
CREATE INDEX "Transaksi_dompetId_idx" ON "Transaksi"("dompetId");

-- CreateIndex
CREATE INDEX "Transaksi_kategoriId_idx" ON "Transaksi"("kategoriId");

-- AddForeignKey
ALTER TABLE "Transaksi" ADD CONSTRAINT "Transaksi_dompetId_fkey" FOREIGN KEY ("dompetId") REFERENCES "Dompet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaksi" ADD CONSTRAINT "Transaksi_dompetAsalId_fkey" FOREIGN KEY ("dompetAsalId") REFERENCES "Dompet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaksi" ADD CONSTRAINT "Transaksi_dompetTujuanId_fkey" FOREIGN KEY ("dompetTujuanId") REFERENCES "Dompet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaksi" ADD CONSTRAINT "Transaksi_kategoriId_fkey" FOREIGN KEY ("kategoriId") REFERENCES "Kategori"("id") ON DELETE SET NULL ON UPDATE CASCADE;
