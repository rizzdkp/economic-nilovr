import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { kategoriUpdateSchema } from "@/lib/validation/kategori";

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/kategori/[id]">) {
  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = kategoriUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: parsed.error.issues[0]?.message ?? "Data tidak valid" },
      { status: 400 },
    );
  }

  const existing = await prisma.kategori.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ success: false, message: "Kategori tidak ditemukan." }, { status: 404 });
  }

  const { nama, warna, ikon, disembunyikan } = parsed.data;
  if (existing.isDefault && (nama !== undefined || warna !== undefined || ikon !== undefined)) {
    return NextResponse.json(
      { success: false, message: "Kategori default tidak bisa diubah nama/warna/ikon, hanya bisa disembunyikan." },
      { status: 400 },
    );
  }

  const kategori = await prisma.kategori.update({
    where: { id },
    data: { nama, warna, ikon, disembunyikan },
  });
  return NextResponse.json({ success: true, data: kategori });
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/kategori/[id]">) {
  const { id } = await ctx.params;
  const existing = await prisma.kategori.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ success: false, message: "Kategori tidak ditemukan." }, { status: 404 });
  }
  if (existing.isDefault) {
    return NextResponse.json(
      { success: false, message: "Kategori default tidak bisa dihapus." },
      { status: 400 },
    );
  }

  await prisma.$transaction(async (tx) => {
    const lainnya = await tx.kategori.findFirst({
      where: { jenis: existing.jenis, nama: "Lainnya" },
    });
    if (lainnya) {
      await tx.transaksi.updateMany({
        where: { kategoriId: id },
        data: { kategoriId: lainnya.id },
      });
    }
    await tx.kategori.delete({ where: { id } });
  });

  return NextResponse.json({ success: true });
}
