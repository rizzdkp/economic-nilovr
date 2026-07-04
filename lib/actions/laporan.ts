"use server";

import { getTrendData, getBreakdownKategori, getBreakdownDompet } from "@/lib/laporan-data";
import { awalBulan, akhirBulan } from "@/lib/format";

export async function fetchTrend(bulanRange: 3 | 6 | 12) {
  return getTrendData(bulanRange);
}

export async function fetchBreakdownBulanIni() {
  const now = new Date();
  return getBreakdownKategori(awalBulan(now), akhirBulan(now));
}

export async function fetchBreakdownDompet() {
  return getBreakdownDompet();
}
