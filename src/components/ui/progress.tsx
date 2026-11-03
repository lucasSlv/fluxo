import { cn } from "@/lib/utils";

export function progressTone(pct: number): string {
  if (pct >= 100) return "bg-neg";
  if (pct >= 90) return "bg-red-400";
  if (pct >= 75) return "bg-warn";
  return "bg-ink";
}

export function Progress({ value, className, tone, size = "md" }: { value: number; className?: string; tone?: string; size?: "sm" | "md" }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("w-full overflow-hidden rounded-full bg-black/[0.07]", size === "sm" ? "h-1.5" : "h-2.5", className)} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn("h-full rounded-full transition-[width] duration-700 ease-out", tone ?? progressTone(value))} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Anel de progresso (como o "83%" da referência). */
export function ProgressRing({ value, size = 44, stroke = 4, className }: { value: number; size?: number; stroke?: number; className?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity={0.12} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c} strokeLinecap="round" className="transition-[stroke-dashoffset] duration-700" />
      </svg>
      <span className="absolute text-[10px] font-bold tabular">{Math.round(value)}%</span>
    </div>
  );
}
