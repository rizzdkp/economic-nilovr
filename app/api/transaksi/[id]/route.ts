import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { transaksiUpdateSchema } from "@/lib/validation/transaksi";

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/transaksi/[id]">) {
  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = transaksiUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: parsed.error.issues[0]?.message ?? "Data tidak valid" },
      { status: 400 },
    );
  }

  const { jenis, tanggal, jumlah, catatan } = parsed.data;
  const data =
    jenis === "transfer"
      ? {
          jenis,
          tanggal,
          jumlah,
          catatan,
          dompetAsalId: parsed.data.dompetAsalId,
          dompetTujuanId: parsed.data.dompetTujuanId,
          dompetId: null,
          kategoriId: null,
        }
      : {
          jenis,
          tanggal,
          jumlah,
          catatan,
          dompetId: parsed.data.dompetId,
          kategoriId: parsed.data.kategoriId,
          dompetAsalId: null,
          dompetTujuanId: null,
        };

  const transaksi = await prisma.transaksi.update({ where: { id }, data });
  return NextResponse.json({ success: true, data: transaksi });
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/transaksi/[id]">) {
  const { id } = await ctx.params;
  await prisma.transaksi.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
