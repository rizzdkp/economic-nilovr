import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { kategoriCreateSchema } from "@/lib/validation/kategori";

export async function GET(request: NextRequest) {
  const jenis = request.nextUrl.searchParams.get("jenis");
  const kategori = await prisma.kategori.findMany({
    where: jenis === "income" || jenis === "expense" ? { jenis } : undefined,
    orderBy: [{ isDefault: "desc" }, { nama: "asc" }],
  });
  return NextResponse.json({ success: true, data: kategori });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = kategoriCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: parsed.error.issues[0]?.message ?? "Data tidak valid" },
      { status: 400 },
    );
  }

  try {
    const kategori = await prisma.kategori.create({ data: { ...parsed.data, isDefault: false } });
    return NextResponse.json({ success: true, data: kategori }, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json(
        { success: false, message: "Kategori dengan nama & jenis ini sudah ada." },
        { status: 409 },
      );
    }
    throw error;
  }
}
