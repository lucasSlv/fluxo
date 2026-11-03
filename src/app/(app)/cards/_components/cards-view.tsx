"use client";

import Link from "next/link";
import { useState } from "react";
import { CreditCard, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty";
import { Modal } from "@/components/ui/modal";
import { Progress } from "@/components/ui/progress";
import { ArchiveDeleteButton } from "@/components/finance/archive-delete-button";
import { formatMoney } from "@/lib/money";
import { deleteCardAction } from "@/modules/credit-cards/actions";
import { CardForm, type CardFormValue } from "./card-form";

export type CardItem = {
  id: string;
  name: string;
  institution: string;
  limit: number;
  closingDay: number;
  dueDay: number;
  color: string;
  defaultAccountId: string | null;
  archived: boolean;
  used: number;
  available: number;
};

export function CardVisual({ c, compact }: { c: CardItem; compact?: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-5 text-white shadow-float" style={{ background: `linear-gradient(135deg, ${c.color}, #0b0b0b)` }}>
      <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10" />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-white/60">{c.institution || "Cartão de crédito"}</p>
          <p className="text-lg font-extrabold tracking-tight">{c.name}</p>
        </div>
        <CreditCard size={22} className="text-white/70" />
      </div>
      {!compact && (
        <div className="mt-8 flex items-end justify-between text-xs">
          <div>
            <p className="text-white/60">Disponível</p>
            <p className="text-xl font-extrabold tabular">{formatMoney(c.available)}</p>
          </div>
          <p className="text-white/60">
            Fecha dia {c.closingDay} · vence dia {c.dueDay}
          </p>
        </div>
      )}
    </div>
  );
}

export function CardsView({ cards }: { cards: CardItem[] }) {
  const [form, setForm] = useState<CardFormValue | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const visible = cards.filter((c) => showArchived || !c.archived);
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        {cards.some((c) => c.archived) ? (
          <button className="text-xs font-semibold text-ink-3 hover:text-ink" onClick={() => setShowArchived((s) => !s)}>
            {showArchived ? "Ocultar arquivados" : "Mostrar arquivados"}
          </button>
        ) : (
          <span />
        )}
        <Button onClick={() => setForm({ name: "", institution: "", limit: null, closingDay: 25, dueDay: 5, color: "#0b0b0b", defaultAccountId: "" })}>
          <Plus size={16} /> Novo cartão
        </Button>
      </div>
      {visible.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((c) => {
            const pct = c.limit > 0 ? (c.used / c.limit) * 100 : 0;
            return (
              <div key={c.id} className={c.archived ? "opacity-60" : undefined}>
                <Link href={`/cards/${c.id}`} className="block transition hover:-translate-y-0.5">
                  <CardVisual c={c} />
                </Link>
                <div className="mt-3 space-y-2 px-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-ink-3">
                      Usado {formatMoney(c.used)} de {formatMoney(c.limit)}
                    </span>
                    <span className="tabular">{Math.round(pct)}%</span>
                  </div>
                  <Progress value={pct} size="sm" />
                  <div className="flex items-center justify-between pt-1">
                    {c.archived ? <Badge>Arquivado</Badge> : <Link href={`/cards/${c.id}`} className="text-xs font-semibold text-ink hover:underline">Ver faturas →</Link>}
                    <div className="flex">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Editar"
                        onClick={() => setForm({ id: c.id, name: c.name, institution: c.institution ?? "", limit: c.limit, closingDay: c.closingDay, dueDay: c.dueDay, color: c.color, defaultAccountId: c.defaultAccountId ?? "" })}
                      >
                        <Pencil size={14} />
                      </Button>
                      <ArchiveDeleteButton
                        action={() => deleteCardAction(c.id)}
                        title={c.archived ? `Desarquivar ${c.name}?` : `Excluir ${c.name}?`}
                        description="Cartões com lançamentos são arquivados (ou desarquivados) para preservar o histórico das faturas."
                        labels={{ deleted: "Cartão excluído", archived: c.archived ? "Cartão desarquivado" : "Cartão arquivado (possui lançamentos)" }}
                      >
                        <Trash2 size={14} />
                      </ArchiveDeleteButton>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={<CreditCard size={20} />} title="Nenhum cartão cadastrado" description="Cadastre seus cartões para acompanhar faturas, parcelas e limite disponível." />
      )}
      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? "Editar cartão" : "Novo cartão"} size="lg">
        {form && <CardForm initial={form} onDone={() => setForm(null)} />}
      </Modal>
    </>
  );
}
