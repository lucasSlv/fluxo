import Link from "next/link";
import { cn } from "@/lib/utils";

/** Abas em texto, como "All Courses / The Newest" da referência. Navegação por URL. */
export function LinkTabs({ items, active }: { items: { href: string; label: string; value: string }[]; active: string }) {
  return (
    <nav className="flex gap-5 overflow-x-auto text-[13px] font-semibold scroll-thin">
      {items.map((t) => (
        <Link key={t.value} href={t.href} scroll={false} className={cn("whitespace-nowrap pb-1 transition-colors", t.value === active ? "text-ink" : "text-ink-4 hover:text-ink-2")}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

export function SegTabs<T extends string>({ items, value, onChange }: { items: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex rounded-xl bg-muted p-1 text-xs font-semibold">
      {items.map((t) => (
        <button
          type="button"
          key={t.value}
          onClick={() => onChange(t.value)}
          className={cn("rounded-lg px-3 py-1.5 transition", t.value === value ? "bg-surface text-ink shadow-sm" : "text-ink-3 hover:text-ink")}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
