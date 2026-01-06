"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type Props = {
  title: string;
  data: { group: string; value: number }[];
  valueLabel?: string;
};

function formatPct(x: number) {
  return `${(x * 100).toFixed(1)}%`;
}

export default function GroupBarChart({ title, data, valueLabel = "Value" }: Props) {
  return (
    <div className="rounded-2xl border border-gray-200 p-6 shadow-sm">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">{valueLabel}</p>

      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="group" />
            <YAxis tickFormatter={formatPct} />
            <Tooltip formatter={(v: number) => formatPct(v as number)} />
            <Bar dataKey="value" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
