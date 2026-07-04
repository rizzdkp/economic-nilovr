import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dompetUpdateSchema } from "@/lib/validation/dompet";

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/dompet/[id]">) {
  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = dompetUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: parsed.error.issues[0]?.message ?? "Data tidak valid" },
      { status: 400 },
    );
  }

  const dompet = await prisma.dompet.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ success: true, data: dompet });
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/dompet/[id]">) {
  const { id } = await ctx.params;

  const transaksiCount = await prisma.transaksi.count({
    where: { OR: [{ dompetId: id }, { dompetAsalId: id }, { dompetTujuanId: id }] },
  });

  if (transaksiCount > 0) {
    return NextResponse.json(
      {
        success: false,
        hasTransactions: true,
        message: "Dompet ini masih punya transaksi. Arsipkan dompet ini alih-alih menghapusnya.",
      },
      { status: 409 },
    );
  }

  await prisma.dompet.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
