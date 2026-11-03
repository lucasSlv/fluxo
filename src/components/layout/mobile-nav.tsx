"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogOut, Menu, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/modules/auth/actions";
import { NAV } from "./nav";
import { useQuickAdd } from "./quick-add";

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const openQuickAdd = useQuickAdd();
  const main = NAV.filter((n) => n.mobile);
  return (
    <>
      <nav className="no-print fixed inset-x-3 bottom-3 z-40 flex items-center justify-around rounded-[22px] bg-ink px-2 py-2 text-white shadow-float md:hidden">
        {main.slice(0, 2).map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} aria-label={label} className={cn("flex h-11 w-11 items-center justify-center rounded-2xl", pathname.startsWith(href) ? "bg-white text-ink" : "text-white/70")}>
            <Icon size={20} />
          </Link>
        ))}
        <button onClick={() => openQuickAdd()} aria-label="Nova movimentação" className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-ink">
          <Plus size={22} strokeWidth={2.5} />
        </button>
        {main.slice(2).map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} aria-label={label} className={cn("flex h-11 w-11 items-center justify-center rounded-2xl", pathname.startsWith(href) ? "bg-white text-ink" : "text-white/70")}>
            <Icon size={20} />
          </Link>
        ))}
        <button onClick={() => setOpen(true)} aria-label="Menu" className="flex h-11 w-11 items-center justify-center rounded-2xl text-white/70">
          <Menu size={20} />
        </button>
      </nav>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 md:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-x-3 bottom-3 animate-in rounded-[26px] bg-ink p-4 text-white" onClick={(e) => e.stopPropagation()}>
            <div className="grid grid-cols-3 gap-2">
              {NAV.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} onClick={() => setOpen(false)} className={cn("flex flex-col items-center gap-1.5 rounded-2xl px-2 py-3 text-[11px] font-semibold", pathname.startsWith(href) ? "bg-white text-ink" : "text-white/80 hover:bg-white/10")}>
                  <Icon size={20} />
                  {label}
                </Link>
              ))}
              <form action={logoutAction} className="contents">
                <button className="flex flex-col items-center gap-1.5 rounded-2xl px-2 py-3 text-[11px] font-semibold text-white/80 hover:bg-white/10">
                  <LogOut size={20} />
                  Sair
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
