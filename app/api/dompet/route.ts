import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dompetCreateSchema } from "@/lib/validation/dompet";
import { getDompetDenganSaldo } from "@/lib/dompet-saldo";

export async function GET() {
  const dompet = await getDompetDenganSaldo();
  return NextResponse.json({ success: true, data: dompet });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = dompetCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: parsed.error.issues[0]?.message ?? "Data tidak valid" },
      { status: 400 },
    );
  }

  const dompet = await prisma.dompet.create({ data: parsed.data });
  return NextResponse.json({ success: true, data: dompet }, { status: 201 });
}
