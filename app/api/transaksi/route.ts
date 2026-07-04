import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { transaksiCreateSchema, transaksiFilterSchema } from "@/lib/validation/transaksi";
import { buildTransaksiWhere } from "@/lib/transaksi-query";

function splitParam(value: string | null): string[] | undefined {
  if (!value) return undefined;
  return value.split(",").filter(Boolean);
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const parsed = transaksiFilterSchema.safeParse({
    dariTanggal: params.get("dariTanggal") ?? undefined,
    sampaiTanggal: params.get("sampaiTanggal") ?? undefined,
    dompetId: splitParam(params.get("dompetId")),
    kategoriId: splitParam(params.get("kategoriId")),
    jenis: params.get("jenis") ?? undefined,
    cari: params.get("cari") ?? undefined,
    page: params.get("page") ?? undefined,
    pageSize: params.get("pageSize") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: parsed.error.issues[0]?.message ?? "Filter tidak valid" },
      { status: 400 },
    );
  }

  const where = buildTransaksiWhere(parsed.data);
  const { page, pageSize } = parsed.data;

  const [data, total] = await Promise.all([
    prisma.transaksi.findMany({
      where,
      include: { dompet: true, dompetAsal: true, dompetTujuan: true, kategori: true },
      orderBy: [{ tanggal: "desc" }, { dibuatPada: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.transaksi.count({ where }),
  ]);

  return NextResponse.json({ success: true, data, total, page, pageSize });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = transaksiCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: parsed.error.issues[0]?.message ?? "Data tidak valid" },
      { status: 400 },
    );
  }

  const { jenis, tanggal, jumlah, catatan } = parsed.data;
  const data =
    jenis === "transfer"
      ? { jenis, tanggal, jumlah, catatan, dompetAsalId: parsed.data.dompetAsalId, dompetTujuanId: parsed.data.dompetTujuanId }
      : { jenis, tanggal, jumlah, catatan, dompetId: parsed.data.dompetId, kategoriId: parsed.data.kategoriId };

  const transaksi = await prisma.transaksi.create({ data });
  return NextResponse.json({ success: true, data: transaksi }, { status: 201 });
}
