import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Tone = "neutral" | "pos" | "neg" | "warn" | "info" | "dark";

const tones: Record<Tone, string> = {
  neutral: "bg-muted text-ink-2",
  pos: "bg-pos-soft text-green-800",
  neg: "bg-neg-soft text-red-800",
  warn: "bg-warn-soft text-amber-800",
  info: "bg-info-soft text-blue-800",
  dark: "bg-ink text-white",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold", tones[tone], className)}>{children}</span>;
}
