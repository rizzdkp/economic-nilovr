"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatRupiah } from "@/lib/format";

const compactFormatter = new Intl.NumberFormat("id-ID", { notation: "compact" });

interface TrendChartProps {
  data: { bulan: string; pemasukan: number; pengeluaran: number }[];
}

export function TrendChart({ data }: TrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="bulan"
          tick={{ fontSize: 12, fill: "var(--text-secondary)" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "var(--text-secondary)" }}
          axisLine={false}
          tickLine={false}
          width={48}
          tickFormatter={(value: number) => compactFormatter.format(value)}
        />
        <Tooltip
          formatter={(value) => formatRupiah(Number(value))}
          contentStyle={{
            borderRadius: 9,
            border: "1px solid var(--border)",
            background: "var(--surface)",
            color: "var(--text-primary)",
          }}
          cursor={{ fill: "var(--accent-soft)", opacity: 0.4 }}
        />
        <Bar dataKey="pemasukan" name="Pemasukan" fill="var(--success)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="pengeluaran" name="Pengeluaran" fill="var(--danger)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
