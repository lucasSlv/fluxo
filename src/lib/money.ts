/** Todos os valores monetários trafegam e são persistidos em centavos inteiros. */

export function formatMoney(cents: number, currency = "BRL", opts: { sign?: boolean; compact?: boolean } = {}): string {
  const value = cents / 100;
  const fmt = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    notation: opts.compact ? "compact" : "standard",
    maximumFractionDigits: opts.compact ? 1 : 2,
    minimumFractionDigits: opts.compact ? 0 : 2,
  });
  const s = fmt.format(Math.abs(value));
  if (cents < 0) return `-${s}`;
  if (opts.sign && cents > 0) return `+${s}`;
  return s;
}

/** Converte texto digitado ("1.234,56", "1234.5", "R$ 10") em centavos. Retorna null se inválido. */
export function parseMoney(input: string | number): number | null {
  if (typeof input === "number") return Number.isFinite(input) ? Math.round(input * 100) : null;
  let s = input.replace(/[R$\s]/g, "").trim();
  if (!s) return null;
  const negative = s.startsWith("-");
  s = s.replace(/^-/, "");
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > lastDot) s = s.replace(/\./g, "").replace(",", ".");
  else if (lastDot > lastComma && lastComma !== -1) s = s.replace(/,/g, "");
  else if (lastComma === -1 && (s.match(/\./g)?.length ?? 0) > 1) s = s.replace(/\./g, "");
  if (!/^\d+(\.\d{0,2})?$/.test(s)) return null;
  const [int, frac = ""] = s.split(".");
  const cents = Number(int) * 100 + Number((frac + "00").slice(0, 2));
  return negative ? -cents : cents;
}

/** Divide um total em N parcelas inteiras; a diferença de arredondamento vai para a primeira parcela. */
export function splitInstallments(total: number, count: number): number[] {
  if (!Number.isInteger(total) || !Number.isInteger(count) || count < 1) throw new Error("Parcelamento inválido");
  const base = Math.floor(total / count);
  const rest = total - base * count;
  return Array.from({ length: count }, (_, i) => (i === 0 ? base + rest : base));
}

export function percent(part: number, whole: number): number {
  if (!whole) return 0;
  return (part / whole) * 100;
}
