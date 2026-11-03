import { describe, expect, it } from "vitest";
import { buildInsights, type InsightInput } from "@/modules/reports/insights";

const base: InsightInput = {
  month: "2026-11",
  series: [
    { month: "2026-08", income: 500000, expense: 300000 },
    { month: "2026-09", income: 500000, expense: 300000 },
    { month: "2026-10", income: 500000, expense: 300000 },
    { month: "2026-11", income: 500000, expense: 300000 },
  ],
  categoriesNow: [],
  categoriesPrev: [],
  fixedExpenses: 0,
  budgets: [],
  goals: [],
  overdueCount: 0,
  overdueTotal: 0,
};

describe("insights", () => {
  it("reports category increase vs previous month", () => {
    const r = buildInsights({ ...base, categoriesNow: [{ categoryId: "1", name: "Alimentação", total: 118000 }], categoriesPrev: [{ categoryId: "1", name: "Alimentação", total: 100000 }] });
    expect(r.map((i) => i.text)).toContain("Seus gastos com alimentação aumentaram 18% em relação ao mês anterior.");
  });

  it("reports savings on a category", () => {
    const r = buildInsights({ ...base, categoriesNow: [{ categoryId: "2", name: "Lazer", total: 25000 }], categoriesPrev: [{ categoryId: "2", name: "Lazer", total: 50000 }] });
    expect(r.some((i) => i.text.startsWith("Você gastou") && i.text.includes("250,00") && i.text.includes("lazer"))).toBe(true);
  });

  it("reports fixed commitment share", () => {
    const r = buildInsights({ ...base, fixedExpenses: 175000 });
    expect(r.map((i) => i.text)).toContain("Você compromete 35% da sua renda com despesas fixas.");
  });

  it("reports consecutive negative months", () => {
    const series = [...base.series.slice(0, 2), { month: "2026-10", income: 100, expense: 200 }, { month: "2026-11", income: 100, expense: 300 }];
    const r = buildInsights({ ...base, series });
    expect(r[0].text).toBe("Seu resultado financeiro está negativo pelo segundo mês consecutivo.");
  });

  it("reports goal ETA only when there is a pace", () => {
    const r = buildInsights({ ...base, goals: [{ name: "Moto", monthsLeft: 6, remaining: 600000 }, { name: "Casa", monthsLeft: null, remaining: 1 }] });
    expect(r.filter((i) => i.id.startsWith("goal-")).map((i) => i.text)).toEqual([
      'Mantendo seu ritmo atual de economia, você alcançará "Moto" em aproximadamente 6 meses.',
    ]);
  });

  it("generates nothing without data", () => {
    expect(buildInsights({ ...base, series: [] })).toEqual([]);
  });
});

describe("insights in a partial month", () => {
  it("omits 'spent less' comparisons but keeps increases", () => {
    const r = buildInsights({
      ...base,
      partialMonth: true,
      categoriesNow: [
        { categoryId: "1", name: "Lazer", total: 10000 },
        { categoryId: "2", name: "Saúde", total: 90000 },
      ],
      categoriesPrev: [
        { categoryId: "1", name: "Lazer", total: 50000 },
        { categoryId: "2", name: "Saúde", total: 50000 },
      ],
    });
    expect(r.some((i) => i.id === "cat-down-1")).toBe(false);
    expect(r.some((i) => i.id === "cat-up-2")).toBe(true);
  });
});
