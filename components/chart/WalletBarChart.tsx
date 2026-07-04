"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatRupiah } from "@/lib/format";

interface WalletBarChartProps {
  data: { nama: string; warna: string; saldo: number }[];
}

export function WalletBarChart({ data }: WalletBarChartProps) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-text-secondary">Belum ada dompet aktif.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 56)}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="nama"
          width={100}
          tick={{ fontSize: 12, fill: "var(--text-secondary)" }}
          axisLine={false}
          tickLine={false}
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
        <Bar dataKey="saldo" name="Saldo" radius={[0, 4, 4, 0]}>
          {data.map((entry) => (
            <Cell key={entry.nama} fill={entry.warna} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
