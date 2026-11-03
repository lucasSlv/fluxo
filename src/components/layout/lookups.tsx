"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Lookups } from "@/modules/shared/lookups";

const Ctx = createContext<Lookups>({ accounts: [], categories: [], cards: [], boxes: [] });

export function LookupsProvider({ value, children }: { value: Lookups; children: ReactNode }) {
  return <Ctx value={value}>{children}</Ctx>;
}

export const useLookups = () => useContext(Ctx);
