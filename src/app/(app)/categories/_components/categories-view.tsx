"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArchiveDeleteButton } from "@/components/finance/archive-delete-button";
import { Field, Input, Select } from "@/components/ui/field";
import { CategoryIcon, ICON_NAMES, IconTile } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import { SegTabs } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAction } from "@/hooks/use-action";
import { cn } from "@/lib/utils";
import { createCategoryAction, deleteCategoryAction, updateCategoryAction } from "@/modules/categories/actions";
import type { CategoryNode } from "@/modules/categories/service";

const COLORS = ["#0b0b0b", "#6b7280", "#ef4444", "#f97316", "#eab308", "#22c55e", "#16a34a", "#14b8a6", "#0ea5e9", "#2563eb", "#6366f1", "#8b5cf6", "#ec4899", "#64748b"];

type Form = { id?: string; name: string; kind: "income" | "expense"; icon: string; color: string; parentId: string };

export function CategoriesView({ categories }: { categories: CategoryNode[] }) {
  const [kind, setKind] = useState<"expense" | "income">("expense");
  const [form, setForm] = useState<Form | null>(null);
  const roots = categories.filter((c) => c.kind === kind);

  const openNew = (parentId = "") => setForm({ name: "", kind, icon: "tag", color: "#6b7280", parentId });
  const openEdit = (c: CategoryNode) => setForm({ id: c.id, name: c.name, kind: c.kind, icon: c.icon, color: c.color, parentId: c.parentId ?? "" });

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <SegTabs
          value={kind}
          onChange={setKind}
          items={[
            { value: "expense", label: "Despesas" },
            { value: "income", label: "Receitas" },
          ]}
        />
        <Button onClick={() => openNew()}>
          <Plus size={16} /> Nova categoria
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {roots.map((c) => (
          <Card key={c.id} className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <IconTile name={c.icon} color={c.color} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{c.name}</p>
                <p className="text-xs text-ink-3">
                  {c.children.length ? `${c.children.length} subcategoria${c.children.length > 1 ? "s" : ""}` : "Sem subcategorias"}
                </p>
              </div>
              {c.system && <Badge>Sistema</Badge>}
              <CategoryActions c={c} onEdit={() => openEdit(c)} />
            </div>
            {c.children.length > 0 && (
              <ul className="space-y-1 border-t border-line pt-3">
                {c.children.map((s) => (
                  <li key={s.id} className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm hover:bg-surface">
                    <CategoryIcon name={s.icon} size={14} className="shrink-0" />
                    <span className="flex-1 truncate">{s.name}</span>
                    <CategoryActions c={s} onEdit={() => openEdit(s)} />
                  </li>
                ))}
              </ul>
            )}
            <button onClick={() => openNew(c.id)} className="self-start text-xs font-semibold text-ink-3 hover:text-ink">
              + Adicionar subcategoria
            </button>
          </Card>
        ))}
        {!roots.length && <p className="text-sm text-ink-3">Nenhuma categoria deste tipo.</p>}
      </div>

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? "Editar categoria" : "Nova categoria"}>
        {form && <CategoryForm initial={form} roots={categories} onDone={() => setForm(null)} />}
      </Modal>
    </>
  );
}

function CategoryActions({ c, onEdit }: { c: CategoryNode; onEdit: () => void }) {
  return (
    <div className="flex shrink-0 items-center">
      <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Editar">
        <Pencil size={14} />
      </Button>
      {!c.system && (
        <ArchiveDeleteButton
          action={() => deleteCategoryAction(c.id)}
          title={`Excluir "${c.name}"?`}
          description="Se houver movimentações ou recorrências, a categoria (e suas subcategorias) será arquivada para preservar o histórico."
          labels={{ deleted: "Categoria excluída", archived: "Categoria arquivada (possui histórico)" }}
        >
          <Trash2 size={14} />
        </ArchiveDeleteButton>
      )}
    </div>
  );
}

function CategoryForm({ initial, roots, onDone }: { initial: Form; roots: CategoryNode[]; onDone: () => void }) {
  const [v, setV] = useState(initial);
  const save = useAction<Form, unknown>(
    (f) => {
      const input = { name: f.name, kind: f.kind, icon: f.icon, color: f.color, parentId: f.parentId || null };
      return f.id ? updateCategoryAction(f.id, input) : createCategoryAction(input);
    },
    { success: "Categoria salva", onSuccess: onDone },
  );
  const err = save.fieldErrors;
  const parents = roots.filter((r) => r.kind === v.kind && r.id !== v.id);
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        save.run(v);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome" error={err.name} className="sm:col-span-2">
          <Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} invalid={!!err.name} autoFocus maxLength={50} />
        </Field>
        <Field label="Tipo" error={err.kind}>
          <Select value={v.kind} onChange={(e) => setV({ ...v, kind: e.target.value as Form["kind"], parentId: "" })}>
            <option value="expense">Despesa</option>
            <option value="income">Receita</option>
          </Select>
        </Field>
        <Field label="Categoria-mãe (opcional)" error={err.parentId}>
          <Select value={v.parentId} onChange={(e) => setV({ ...v, parentId: e.target.value })}>
            <option value="">Nenhuma (principal)</option>
            {parents.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Ícone">
        <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-10">
          {ICON_NAMES.map((name) => (
            <button
              type="button"
              key={name}
              onClick={() => setV({ ...v, icon: name })}
              className={cn("flex h-9 items-center justify-center rounded-lg transition", v.icon === name ? "bg-ink text-white" : "bg-muted text-ink-2 hover:bg-neutral-200")}
              aria-label={name}
            >
              <CategoryIcon name={name} size={16} />
            </button>
          ))}
        </div>
      </Field>
      <Field label="Cor">
        <div className="flex flex-wrap gap-2">
          {COLORS.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => setV({ ...v, color: c })}
              className={cn("h-7 w-7 rounded-full ring-offset-2 transition", v.color === c && "ring-2 ring-ink")}
              style={{ background: c }}
              aria-label={c}
            />
          ))}
        </div>
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" loading={save.pending}>
          Salvar
        </Button>
      </div>
    </form>
  );
}
