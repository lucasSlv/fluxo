import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

/** Exibe um valor em centavos. `colored` pinta positivo/negativo. */
export function Money({ value, colored, sign, className, currency }: { value: number; colored?: boolean; sign?: boolean; className?: string; currency?: string }) {
  return (
    <span className={cn("tabular", colored && (value > 0 ? "text-pos" : value < 0 ? "text-neg" : ""), className)}>
      {formatMoney(value, currency, { sign })}
    </span>
  );
}
