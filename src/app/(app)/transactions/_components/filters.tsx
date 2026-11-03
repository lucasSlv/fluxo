"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { useLookups } from "@/components/layout/lookups";

const KEYS = ["from", "to", "categoryId", "accountId", "cardId", "status", "nature", "min", "max", "sort", "q"] as const;

/** Filtros avançados; tudo vive na URL (compartilhável e com voltar/avançar do navegador). */
export function TransactionFilters() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { categories, accounts, cards } = useLookups();
  const [open, setOpen] = useState(KEYS.some((k) => k !== "sort" && k !== "q" && k !== "status" && sp.get(k)));
  const [f, setF] = useState<Record<string, string>>(() => Object.fromEntries(KEYS.map((k) => [k, sp.get(k) ?? ""])));
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));
  const apply = (next = f) => {
    const p = new URLSearchParams(sp.toString());
    KEYS.forEach((k) => (next[k] ? p.set(k, next[k]) : p.delete(k)));
    p.delete("page");
    router.push(`${pathname}?${p.toString()}`);
  };
  const clear = () => {
    const empty = Object.fromEntries(KEYS.map((k) => [k, ""]));
    setF(empty);
    const p = new URLSearchParams();
    if (sp.get("kind")) p.set("kind", sp.get("kind")!);
    router.push(`${pathname}?${p.toString()}`);
  };
  const active = KEYS.filter((k) => k !== "sort" && sp.get(k)).length;

  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-center gap-2">
        <form
          className="flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            apply();
          }}
        >
          <Input placeholder="Buscar por descrição…" value={f.q} onChange={(e) => set("q", e.target.value)} className="min-w-48" />
        </form>
        <Select className="w-auto" value={f.sort || "date_desc"} onChange={(e) => apply({ ...f, sort: e.target.value })} aria-label="Ordenação">
          <option value="date_desc">Mais recentes</option>
          <option value="date_asc">Mais antigas</option>
          <option value="amount_desc">Maior valor</option>
          <option value="amount_asc">Menor valor</option>
        </Select>
        <Button variant={open ? "primary" : "secondary"} onClick={() => setOpen((o) => !o)}>
          <SlidersHorizontal size={15} /> Filtros {active > 0 && <span className="rounded-full bg-white/20 px-1.5 text-[10px]">{active}</span>}
        </Button>
        {active > 0 && (
          <Button variant="ghost" onClick={clear}>
            <X size={15} /> Limpar
          </Button>
        )}
      </div>
      {open && (
        <div className="mt-3 grid animate-in gap-3 rounded-2xl bg-muted p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="De">
            <Input type="date" value={f.from} onChange={(e) => set("from", e.target.value)} className="bg-surface" />
          </Field>
          <Field label="Até">
            <Input type="date" value={f.to} onChange={(e) => set("to", e.target.value)} className="bg-surface" />
          </Field>
          <Field label="Categoria">
            <Select value={f.categoryId} onChange={(e) => set("categoryId", e.target.value)} className="bg-surface">
              <option value="">Todas</option>
              {categories.map((c) => [
                <option key={c.id} value={c.id}>
                  {c.kind === "income" ? "↑ " : "↓ "}
                  {c.name}
                </option>,
                ...c.children.map((s) => (
                  <option key={s.id} value={s.id}>
                    {"   ↳ "}
                    {s.name}
                  </option>
                )),
              ])}
            </Select>
          </Field>
          <Field label="Conta">
            <Select value={f.accountId} onChange={(e) => set("accountId", e.target.value)} className="bg-surface">
              <option value="">Todas</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </Field>
          {cards.length > 0 && (
            <Field label="Cartão">
              <Select value={f.cardId} onChange={(e) => set("cardId", e.target.value)} className="bg-surface">
                <option value="">Todos</option>
                {cards.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <Field label="Status">
            <Select value={f.status} onChange={(e) => set("status", e.target.value)} className="bg-surface">
              <option value="">Todos (exceto cancelados)</option>
              <option value="paid">Pago / recebido</option>
              <option value="pending">Pendente</option>
              <option value="overdue">Atrasado</option>
              <option value="cancelled">Cancelado</option>
            </Select>
          </Field>
          <Field label="Natureza">
            <Select value={f.nature} onChange={(e) => set("nature", e.target.value)} className="bg-surface">
              <option value="">Fixas e variáveis</option>
              <option value="fixed">Fixas</option>
              <option value="variable">Variáveis</option>
            </Select>
          </Field>
          <Field label="Valor mínimo">
            <MoneyInput value={f.min ? Number(f.min) : null} onChange={(c) => set("min", c ? String(c) : "")} className="bg-surface" />
          </Field>
          <Field label="Valor máximo">
            <MoneyInput value={f.max ? Number(f.max) : null} onChange={(c) => set("max", c ? String(c) : "")} className="bg-surface" />
          </Field>
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4 lg:justify-end">
            <Button onClick={() => apply()}>Aplicar filtros</Button>
          </div>
        </div>
      )}
    </div>
  );
}
