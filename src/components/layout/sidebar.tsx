"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { logoutAction } from "@/modules/auth/actions";
import { cn } from "@/lib/utils";
import { NAV } from "./nav";

/** Barra lateral preta e flutuante, como na referência. Ícones com rótulo em tooltip. */
export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="no-print fixed inset-y-4 left-4 z-30 hidden w-[76px] flex-col items-center rounded-[28px] bg-ink py-6 text-white shadow-float md:flex">
      <Link href="/dashboard" className="mb-6 text-[26px] font-extrabold leading-none tracking-tighter" aria-label="Fluxo">
        F.
      </Link>
      <nav className="flex w-full flex-1 flex-col items-center gap-1 overflow-y-auto px-3 scroll-thin [scrollbar-color:#333_transparent]">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-colors",
                active ? "bg-white text-ink" : "text-white/70 hover:bg-white/10 hover:text-white",
              )}
            >
              <Icon size={19} strokeWidth={2.2} />
              <span className="pointer-events-none fixed left-[100px] hidden rounded-lg bg-ink px-2.5 py-1.5 text-xs font-semibold text-white shadow-float group-hover:block">
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
      <form action={logoutAction} className="mt-4">
        <button className="flex h-11 w-11 items-center justify-center rounded-2xl text-white/70 hover:bg-white/10 hover:text-white" aria-label="Sair" title="Sair">
          <LogOut size={19} />
        </button>
      </form>
    </aside>
  );
}
