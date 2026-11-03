/** Categorias criadas para cada novo usuário. `icon` refere-se a nomes do mapa em components/ui/icon.tsx. */
export const DEFAULT_CATEGORIES: { name: string; kind: "income" | "expense"; icon: string; color: string; system?: string }[] = [
  { name: "Alimentação", kind: "expense", icon: "utensils", color: "#f97316" },
  { name: "Moradia", kind: "expense", icon: "home", color: "#6366f1" },
  { name: "Transporte", kind: "expense", icon: "car", color: "#0ea5e9" },
  { name: "Saúde", kind: "expense", icon: "heart-pulse", color: "#ef4444" },
  { name: "Educação", kind: "expense", icon: "graduation-cap", color: "#8b5cf6" },
  { name: "Lazer", kind: "expense", icon: "party-popper", color: "#ec4899" },
  { name: "Assinaturas", kind: "expense", icon: "tv", color: "#14b8a6" },
  { name: "Compras", kind: "expense", icon: "shopping-bag", color: "#eab308" },
  { name: "Investimentos", kind: "expense", icon: "trending-up", color: "#22c55e" },
  { name: "Dívidas", kind: "expense", icon: "landmark", color: "#64748b", system: "debt" },
  { name: "Outros", kind: "expense", icon: "tag", color: "#9ca3af" },
  { name: "Salário", kind: "income", icon: "briefcase", color: "#16a34a" },
  { name: "Renda extra", kind: "income", icon: "sparkles", color: "#059669" },
  { name: "Rendimentos", kind: "income", icon: "trending-up", color: "#0d9488" },
  { name: "Outros", kind: "income", icon: "tag", color: "#9ca3af" },
];
