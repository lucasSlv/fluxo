import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Bloco cinza-claro da referência (sem borda, cantos arredondados). */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl bg-muted p-5", className)} {...props} />;
}

/** Bloco branco elevado (usado sobre o fundo cinza). */
export function Panel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl bg-surface p-5 shadow-soft", className)} {...props} />;
}

export function CardTitle({ children, action, className }: { children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("mb-4 flex items-center justify-between gap-3", className)}>
      <h2 className="text-[15px] font-bold tracking-tight">{children}</h2>
      {action}
    </div>
  );
}
