import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { requireUser } from "@/modules/auth/dal";
import { calendarEvents, EVENT_STYLE, type CalendarEvent } from "@/modules/calendar/service";
import { daysInMonth, monthKey, parseMonthKey, shiftMonth, toISODate, today, monthTitle } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Stat } from "@/components/ui/stat";

export const metadata = { title: "Calendário" };

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function Chip({ e, cur }: { e: CalendarEvent; cur: string }) {
  const s = EVENT_STYLE[e.type];
  const body = (
    <span className={cn("block truncate rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold leading-tight", s.chip)} title={`${s.label}: ${e.title} — ${formatMoney(e.amount, cur)}`}>
      {e.title}
    </span>
  );
  return e.href ? <Link href={e.href}>{body}</Link> : body;
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const user = await requireUser();
  const tz = user.preferences.timezone;
  const cur = user.preferences.currency;
  const sp = await searchParams;
  const t = today(tz);
  const month = sp.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.month) ? sp.month : monthKey(t);
  const events = await calendarEvents(user.id, month, tz);
  const { y, m } = parseMonthKey(month);
  const firstWeekday = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const total = daysInMonth(y, m);
  const todayIso = toISODate(t);
  const byDay = new Map<string, CalendarEvent[]>();
  for (const e of events) byDay.set(e.date, [...(byDay.get(e.date) ?? []), e]);
  const dayIso = (d: number) => `${month}-${String(d).padStart(2, "0")}`;

  const sum = (types: CalendarEvent["type"][]) => events.filter((e) => types.includes(e.type)).reduce((s, e) => s + e.amount, 0);
  const toPay = sum(["bill_due", "card_invoice", "card_installment", "debt", "recurring"]);
  const toReceive = sum(["income_expected"]);
  const overdue = sum(["bill_overdue"]);
  const usedTypes = (Object.keys(EVENT_STYLE) as CalendarEvent["type"][]).filter((k) => events.some((e) => e.type === k));
  const circle = "flex h-9 w-9 items-center justify-center rounded-full border border-ink/15 text-ink transition hover:bg-ink hover:text-white";

  return (
    <>
      <PageHeader
        title="Calendário financeiro"
        description="Vencimentos, recebimentos, faturas e parcelas do mês."
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/calendar?month=${shiftMonth(month, -1)}`} className={circle} aria-label="Mês anterior">
              <ChevronLeft size={16} />
            </Link>
            <span className="min-w-36 text-center text-sm font-bold">{monthTitle(month)}</span>
            <Link href={`/calendar?month=${shiftMonth(month, 1)}`} className={circle} aria-label="Próximo mês">
              <ChevronRight size={16} />
            </Link>
            {month !== monthKey(t) && (
              <Link href="/calendar" className="ml-1 text-xs font-semibold text-ink-3 hover:text-ink">
                Hoje
              </Link>
            )}
          </div>
        }
      />

      <section className="mb-6 grid grid-cols-3 gap-3">
        <Stat label="A pagar" value={formatMoney(toPay, cur)} tone="warn" />
        <Stat label="A receber" value={formatMoney(toReceive, cur)} tone="pos" />
        <Stat label="Atrasado" value={formatMoney(overdue, cur)} tone={overdue ? "neg" : undefined} />
      </section>

      {/* Grade mensal (tablet/desktop) */}
      <div className="hidden overflow-hidden rounded-2xl bg-muted p-2 md:block">
        <div className="grid grid-cols-7 gap-1 pb-1">
          {WEEKDAYS.map((w) => (
            <div key={w} className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-3">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstWeekday }).map((_, i) => (
            <div key={`pad-${i}`} />
          ))}
          {Array.from({ length: total }, (_, i) => i + 1).map((d) => {
            const iso = dayIso(d);
            const list = byDay.get(iso) ?? [];
            const isToday = iso === todayIso;
            return (
              <div key={iso} className={cn("min-h-28 rounded-xl bg-surface p-1.5", isToday && "ring-2 ring-ink")}>
                <div className="mb-1 flex items-center justify-between px-0.5">
                  <span className={cn("flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold", isToday ? "bg-ink text-white" : "text-ink-2")}>{d}</span>
                  {list.length > 0 && <span className="text-[10px] tabular text-ink-4">{formatMoney(list.reduce((s, e) => s + e.amount, 0), cur, { compact: true })}</span>}
                </div>
                <div className="space-y-0.5">
                  {list.slice(0, 3).map((e) => (
                    <Chip key={e.id} e={e} cur={cur} />
                  ))}
                  {list.length > 3 && <span className="block px-1 text-[10px] font-semibold text-ink-3">+{list.length - 3} mais</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Agenda (mobile) */}
      <div className="space-y-3 md:hidden">
        {[...byDay.entries()].length === 0 && <p className="rounded-2xl bg-muted px-4 py-6 text-center text-sm text-ink-3">Nenhum evento neste mês.</p>}
        {[...byDay.entries()].map(([iso, list]) => (
          <div key={iso} className={cn("rounded-2xl bg-muted p-3", iso === todayIso && "ring-2 ring-ink")}>
            <p className="mb-2 text-xs font-bold text-ink-2">
              {iso.slice(8)}/{iso.slice(5, 7)} · {WEEKDAYS[new Date(`${iso}T00:00:00Z`).getUTCDay()]}
            </p>
            <ul className="space-y-1.5">
              {list.map((e) => (
                <li key={e.id} className="flex items-center gap-2 text-sm">
                  <span className={cn("h-2 w-2 shrink-0 rounded-full", EVENT_STYLE[e.type].dot)} />
                  <span className="min-w-0 flex-1 truncate">{e.href ? <Link href={e.href}>{e.title}</Link> : e.title}</span>
                  <span className="font-semibold tabular">{formatMoney(e.amount, cur)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {usedTypes.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-ink-3">
          {usedTypes.map((k) => (
            <li key={k} className="flex items-center gap-1.5">
              <span className={cn("h-2.5 w-2.5 rounded-full", EVENT_STYLE[k].dot)} /> {EVENT_STYLE[k].label}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
