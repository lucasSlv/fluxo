"use client";

import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney } from "@/lib/money";
import { monthLabel } from "@/lib/dates";

const GRID = "#ececec";
const AXIS = { fontSize: 11, fill: "#8a8a8f" };
const compact = (v: number) => formatMoney(v, "BRL", { compact: true });

/** Previsão dos próximos meses: receitas × despesas já conhecidas. */
export function ForecastBars({ data }: { data: { month: string; income: number; expense: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} barGap={2} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="month" tickFormatter={(m) => monthLabel(m)} tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={compact} tick={AXIS} axisLine={false} tickLine={false} width={64} />
        <Tooltip formatter={(v) => formatMoney(Number(v))} labelFormatter={(m) => monthLabel(String(m), true)} contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 18px 40px -16px rgb(0 0 0 / .25)", fontSize: 12 }} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        <Bar isAnimationActive={false} dataKey="income" name="Receitas previstas" fill="#16a34a" radius={[4, 4, 0, 0]} maxBarSize={22} />
        <Bar isAnimationActive={false} dataKey="expense" name="Despesas previstas" fill="#dc2626" radius={[4, 4, 0, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Taxa de economia mensal (%). Meses sem receita ficam vazios. */
export function SavingsRateLine({ data }: { data: { month: string; savingsRate: number | null }[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="month" tickFormatter={(m) => monthLabel(m)} tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={(v) => `${v}%`} tick={AXIS} axisLine={false} tickLine={false} width={44} />
        <Tooltip
          formatter={(v) => `${Number(v).toFixed(1).replace(".", ",")}%`}
          labelFormatter={(m) => monthLabel(String(m), true)}
          contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 18px 40px -16px rgb(0 0 0 / .25)", fontSize: 12 }}
        />
        <Line isAnimationActive={false} type="monotone" dataKey="savingsRate" name="Taxa de economia" stroke="#0b0b0b" strokeWidth={2.5} dot={{ r: 4, fill: "#0b0b0b", stroke: "#fff", strokeWidth: 2 }} connectNulls={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
