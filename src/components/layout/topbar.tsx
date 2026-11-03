"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Plus, Search } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useQuickAdd } from "./quick-add";

export function Topbar({ name, alerts }: { name: string; alerts: number }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const openQuickAdd = useQuickAdd();
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return (
    <header className="no-print mb-6 flex items-center gap-3">
      <form
        className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-2xl bg-muted px-4 text-sm md:max-w-md"
        onSubmit={(e) => {
          e.preventDefault();
          router.push(`/transactions?q=${encodeURIComponent(q.trim())}`);
        }}
      >
        <Search size={16} className="text-ink-3" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar movimentações…" className="w-full bg-transparent outline-none placeholder:text-ink-4" aria-label="Buscar movimentações" />
      </form>
      <div className="ml-auto flex items-center gap-2">
        <span className="hidden md:block">
          <Button onClick={() => openQuickAdd()}>
            <Plus size={16} strokeWidth={2.5} /> Nova movimentação
          </Button>
        </span>
        <Link href="/dashboard#alertas" className="relative flex h-11 w-11 items-center justify-center rounded-full text-ink-2 hover:bg-muted" aria-label={`${alerts} alertas`}>
          <Bell size={19} />
          {alerts > 0 && <span className="absolute right-2.5 top-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-neg px-1 text-[9px] font-bold text-white">{alerts > 9 ? "9+" : alerts}</span>}
        </Link>
        <Link href="/settings" className="flex items-center gap-2 rounded-full p-1 pr-3 hover:bg-muted" title={name}>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-xs font-bold text-white">{initials}</span>
          <span className="hidden text-sm font-semibold lg:inline">{name.split(" ")[0]}</span>
        </Link>
      </div>
    </header>
  );
}
