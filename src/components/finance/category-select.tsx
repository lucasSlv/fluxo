"use client";

import { Select } from "@/components/ui/field";
import { useLookups } from "@/components/layout/lookups";

/** Select de categorias com subcategorias indentadas, filtrado pelo tipo. */
export function CategorySelect({
  kind,
  value,
  onChange,
  invalid,
  placeholder = "Selecione a categoria",
  onlyRoots,
}: {
  kind: "income" | "expense";
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
  placeholder?: string;
  onlyRoots?: boolean;
}) {
  const { categories } = useLookups();
  const roots = categories.filter((c) => c.kind === kind);
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)} invalid={invalid}>
      <option value="">{placeholder}</option>
      {roots.map((c) => [
        <option key={c.id} value={c.id}>
          {c.name}
        </option>,
        ...(onlyRoots
          ? []
          : c.children.map((s) => (
              <option key={s.id} value={s.id}>
                {"   ↳ "}
                {s.name}
              </option>
            ))),
      ])}
    </Select>
  );
}

export function AccountSelect({ value, onChange, invalid, placeholder = "Selecione a conta", exclude }: { value: string; onChange: (v: string) => void; invalid?: boolean; placeholder?: string; exclude?: string }) {
  const { accounts } = useLookups();
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)} invalid={invalid}>
      <option value="">{placeholder}</option>
      {accounts
        .filter((a) => a.id !== exclude)
        .map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
    </Select>
  );
}
