import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Pagination({ page, pages, hrefFor }: { page: number; pages: number; hrefFor: (p: number) => string }) {
  if (pages <= 1) return null;
  const btn = "flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink-2 transition hover:bg-muted";
  return (
    <div className="mt-4 flex items-center justify-center gap-3 text-sm">
      <Link aria-disabled={page <= 1} className={cn(btn, page <= 1 && "pointer-events-none opacity-40")} href={hrefFor(page - 1)} aria-label="Anterior">
        <ChevronLeft size={16} />
      </Link>
      <span className="tabular text-xs font-semibold text-ink-3">
        Página {page} de {pages}
      </span>
      <Link aria-disabled={page >= pages} className={cn(btn, page >= pages && "pointer-events-none opacity-40")} href={hrefFor(page + 1)} aria-label="Próxima">
        <ChevronRight size={16} />
      </Link>
    </div>
  );
}
