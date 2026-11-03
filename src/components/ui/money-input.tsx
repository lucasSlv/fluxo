"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/** 123456 -> "1.234,56" sem depender dos dados de localidade do navegador. */
function formatDigits(cents: number): string {
  const int = Math.floor(cents / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${int},${String(cents % 100).padStart(2, "0")}`;
}

/** Campo monetário: o usuário digita dígitos e o valor é exibido como R$ 0,00. Emite centavos. */
export function MoneyInput({
  value,
  onChange,
  invalid,
  className,
  placeholder = "0,00",
  autoFocus,
  name,
}: {
  value: number | null;
  onChange: (cents: number | null) => void;
  invalid?: boolean;
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
  name?: string;
}) {
  const [focused, setFocused] = useState(false);
  const display = value == null ? "" : formatDigits(value);
  return (
    <div
      className={cn(
        "flex h-10 items-center rounded-xl border border-line bg-surface px-3.5 text-sm transition",
        focused && "border-ink/20 bg-surface ring-4 ring-black/5",
        invalid && "border-neg/50 bg-neg-soft/40",
        className,
      )}
    >
      <span className="mr-1.5 text-ink-3">R$</span>
      <input
        name={name}
        inputMode="numeric"
        autoFocus={autoFocus}
        aria-invalid={invalid || undefined}
        className="tabular w-full bg-transparent outline-none placeholder:text-ink-4"
        placeholder={placeholder}
        value={display}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").replace(/^0+/, "").slice(0, 13);
          onChange(digits ? Number(digits) : null);
        }}
      />
    </div>
  );
}
