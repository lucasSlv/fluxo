"use client";

import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, LabelList, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { formatMoney } from "@/lib/money";
import { monthLabel } from "@/lib/dates";

const INK = "#0b0b0b";
const GRID = "#ececec";
const AXIS = { fontSize: 11, fill: "#8a8a8f" };
const compact = (v: number) => formatMoney(v, "BRL", { compact: true });

function TooltipBox({ active, payload, label, labelFormatter }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string; labelFormatter?: (l: string) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-surface px-3 py-2 text-xs shadow-float">
      {label && <p className="mb-1 font-bold">{labelFormatter ? labelFormatter(label) : label}</p>}
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 text-ink-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <span className="tabular font-semibold text-ink">{formatMoney(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

/** Linha suave com marcadores e rótulos em "pílula", como o gráfico "Your statistics" da referência. */
export function BalanceLine({ data }: { data: { month: string; balance: number }[] }) {
  const last = data.length - 1;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 28, right: 36, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="month" tickFormatter={(m) => monthLabel(m)} tick={AXIS} axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis tickFormatter={compact} tick={AXIS} axisLine={false} tickLine={false} width={64} />
        <Tooltip content={<TooltipBox labelFormatter={(m) => monthLabel(m, true)} />} cursor={{ stroke: "#d4d4d8" }} />
        <Line isAnimationActive={false} type="monotone" dataKey="balance" name="Saldo" stroke={INK} strokeWidth={2.5} dot={{ r: 4, fill: INK, stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 6 }}>
          <LabelList
            dataKey="balance"
            content={(p) => {
              const { x, y, index, value } = p as { x: number; y: number; index: number; value: number };
              if (index !== last && index !== last - 3 && index !== last - 6) return null;
              const text = compact(value);
              const w = text.length * 6.2 + 12;
              return (
                <g>
                  <rect x={x - w / 2} y={y - 30} width={w} height={20} rx={6} fill="#fff" stroke="#e7e7e7" />
                  <text x={x} y={y - 16} textAnchor="middle" fontSize={10.5} fontWeight={700} fill={INK}>
                    {text}
                  </text>
                </g>
              );
            }}
          />
        </Line>
      </LineChart>
    </ResponsiveContainer>
  );
}

export function IncomeExpenseBars({ data }: { data: { month: string; income: number; expense: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} barGap={2} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="month" tickFormatter={(m) => monthLabel(m)} tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={compact} tick={AXIS} axisLine={false} tickLine={false} width={64} />
        <Tooltip content={<TooltipBox labelFormatter={(m) => monthLabel(m, true)} />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        <Bar isAnimationActive={false} dataKey="income" name="Receitas" fill="#16a34a" radius={[4, 4, 0, 0]} maxBarSize={18} />
        <Bar isAnimationActive={false} dataKey="expense" name="Despesas" fill="#dc2626" radius={[4, 4, 0, 0]} maxBarSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SpendingArea({ data }: { data: { month: string; expense: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="spend" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={INK} stopOpacity={0.18} />
            <stop offset="100%" stopColor={INK} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="month" tickFormatter={(m) => monthLabel(m)} tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={compact} tick={AXIS} axisLine={false} tickLine={false} width={64} />
        <Tooltip content={<TooltipBox labelFormatter={(m) => monthLabel(m, true)} />} />
        <Area isAnimationActive={false} type="monotone" dataKey="expense" name="Despesas" stroke={INK} strokeWidth={2} fill="url(#spend)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Rosca por categoria — a cor segue a categoria (identidade), nunca a posição. */
export function CategoryDonut({ data }: { data: { name: string; total: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.total, 0);
  // Mais de 7 fatias → agrupa o restante em "Outras".
  const top = data.slice(0, 7);
  const rest = data.slice(7).reduce((s, d) => s + d.total, 0);
  const slices = rest > 0 ? [...top, { name: "Outras", total: rest, color: "#c4c4c8" }] : top;
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative h-[180px] w-[180px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie isAnimationActive={false} data={slices} dataKey="total" nameKey="name" innerRadius={58} outerRadius={84} paddingAngle={1.5} stroke="#fff" strokeWidth={2}>
              {slices.map((s) => (
                <Cell key={s.name} fill={s.color} />
              ))}
            </Pie>
            <Tooltip content={<TooltipBox />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-3">Total</span>
          <span className="text-sm font-extrabold tabular">{compact(total)}</span>
        </div>
      </div>
      <ul className="w-full space-y-2 text-xs">
        {slices.map((s) => (
          <li key={s.name} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
            <span className="flex-1 truncate font-medium text-ink-2">{s.name}</span>
            <span className="tabular font-semibold">{formatMoney(s.total)}</span>
            <span className="w-10 text-right tabular text-ink-3">{total ? Math.round((s.total / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Comparativo mensal por categoria (barras agrupadas). */
export function CategoryMonthlyBars({ data, series }: { data: Record<string, number | string>[]; series: { key: string; name: string; color: string }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="month" tickFormatter={(m) => monthLabel(String(m))} tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={compact} tick={AXIS} axisLine={false} tickLine={false} width={64} />
        <Tooltip content={<TooltipBox labelFormatter={(m) => monthLabel(m, true)} />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        {series.map((s) => (
          <Bar isAnimationActive={false} key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={14} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ResultBars({ data }: { data: { month: string; result: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="month" tickFormatter={(m) => monthLabel(m)} tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={compact} tick={AXIS} axisLine={false} tickLine={false} width={64} />
        <Tooltip content={<TooltipBox labelFormatter={(m) => monthLabel(m, true)} />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
        <Bar isAnimationActive={false} dataKey="result" name="Resultado" radius={[4, 4, 4, 4]} maxBarSize={22}>
          {data.map((d) => (
            <Cell key={d.month} fill={d.result >= 0 ? "#16a34a" : "#dc2626"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
