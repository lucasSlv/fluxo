"use client";

import { CheckCircle2, AlertCircle } from "lucide-react";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Toast = { id: number; message: string; tone: "success" | "error" };
const Ctx = createContext<(message: string, tone?: Toast["tone"]) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((message: string, tone: Toast["tone"] = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);
  return (
    <Ctx value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={cn("pointer-events-auto flex animate-in items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-float", t.tone === "error" ? "bg-neg" : "bg-ink")}>
            {t.tone === "error" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
            {t.message}
          </div>
        ))}
      </div>
    </Ctx>
  );
}

export const useToast = () => useContext(Ctx);
