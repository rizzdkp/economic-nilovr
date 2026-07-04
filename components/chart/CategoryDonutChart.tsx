"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatRupiah } from "@/lib/format";

interface CategoryDonutChartProps {
  data: { nama: string; warna: string; total: number; persen: number }[];
}

export function CategoryDonutChart({ data }: CategoryDonutChartProps) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-text-secondary">
        Belum ada pengeluaran periode ini.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="h-[200px] w-full sm:max-w-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="total" nameKey="nama" innerRadius={50} outerRadius={80} paddingAngle={2}>
              {data.map((entry) => (
                <Cell key={entry.nama} fill={entry.warna} stroke="var(--surface)" />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => formatRupiah(Number(value))}
              contentStyle={{
                borderRadius: 9,
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--text-primary)",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex w-full flex-1 flex-col gap-2">
        {data.map((entry) => (
          <li key={entry.nama} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2 text-text-primary">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: entry.warna }} />
              {entry.nama}
            </span>
            <span className="tabular-nums text-text-secondary">{entry.persen.toFixed(0)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
