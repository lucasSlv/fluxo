import {
  ArrowLeftRight, BarChart3, CalendarDays, CreditCard, Gauge, Home, Landmark, PiggyBank, Repeat, Settings, Tags, Target, Wallet, type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon; mobile?: boolean };

export const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Home, mobile: true },
  { href: "/transactions", label: "Movimentações", icon: ArrowLeftRight, mobile: true },
  { href: "/accounts", label: "Contas", icon: Wallet },
  { href: "/cards", label: "Cartões", icon: CreditCard },
  { href: "/budgets", label: "Limites", icon: Gauge },
  { href: "/categories", label: "Categorias", icon: Tags },
  { href: "/recurring", label: "Recorrentes", icon: Repeat },
  { href: "/debts", label: "Dívidas", icon: Landmark },
  { href: "/goals", label: "Objetivos", icon: Target },
  { href: "/savings", label: "Caixinhas", icon: PiggyBank },
  { href: "/calendar", label: "Calendário", icon: CalendarDays },
  { href: "/reports", label: "Relatórios", icon: BarChart3, mobile: true },
  { href: "/settings", label: "Configurações", icon: Settings },
];
