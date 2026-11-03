import { describe, expect, it } from "vitest";
import { formatMoney, parseMoney, splitInstallments } from "@/lib/money";
import { addMonths, monthsBetween, parseDateOnly, shiftMonth, today, toISODate } from "@/lib/dates";
import { resolvePeriod } from "@/lib/period";

describe("money", () => {
  it("parses BR and US formats into integer cents", () => {
    expect(parseMoney("1.234,56")).toBe(123456);
    expect(parseMoney("R$ 10")).toBe(1000);
    expect(parseMoney("1234.5")).toBe(123450);
    expect(parseMoney("0,1")).toBe(10);
    expect(parseMoney("-5,25")).toBe(-525);
    expect(parseMoney("abc")).toBeNull();
    expect(parseMoney("1,234")).toBeNull();
  });

  it("avoids floating point drift (0.1 + 0.2)", () => {
    expect(parseMoney(0.1)! + parseMoney(0.2)!).toBe(30);
  });

  it("splits installments with remainder on the first", () => {
    expect(splitInstallments(10000, 3)).toEqual([3334, 3333, 3333]);
    expect(splitInstallments(10000, 3).reduce((a, b) => a + b)).toBe(10000);
    expect(() => splitInstallments(100, 0)).toThrow();
  });

  it("formats BRL", () => {
    expect(formatMoney(123456).replace(/\s/g, " ")).toBe("R$ 1.234,56");
    expect(formatMoney(-500).replace(/\s/g, " ")).toBe("-R$ 5,00");
  });
});

describe("dates", () => {
  it("clamps month end when adding months", () => {
    expect(toISODate(addMonths(parseDateOnly("2026-01-31"), 1))).toBe("2026-02-28");
    expect(toISODate(addMonths(parseDateOnly("2028-01-31"), 1))).toBe("2028-02-29");
    expect(toISODate(addMonths(parseDateOnly("2026-02-28"), 1, 31))).toBe("2026-03-31");
  });

  it("rejects impossible dates", () => {
    expect(() => parseDateOnly("2026-02-30")).toThrow();
  });

  it("computes today in the user's timezone", () => {
    // 02:00 UTC de 4/nov ainda é 3/nov em São Paulo (UTC-3).
    expect(toISODate(today("America/Sao_Paulo", new Date("2026-11-04T02:00:00Z")))).toBe("2026-11-03");
    expect(toISODate(today("UTC", new Date("2026-11-04T02:00:00Z")))).toBe("2026-11-04");
  });

  it("iterates months", () => {
    expect(monthsBetween("2026-11", "2027-02")).toEqual(["2026-11", "2026-12", "2027-01", "2027-02"]);
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });

  it("resolves periods from URL params", () => {
    const p = resolvePeriod({ month: "2026-03" }, "UTC");
    expect(toISODate(p.from)).toBe("2026-03-01");
    expect(toISODate(p.to)).toBe("2026-03-31");
    expect(toISODate(p.prevFrom)).toBe("2026-02-01");
    const c = resolvePeriod({ from: "2026-01-10", to: "2026-01-19" }, "UTC");
    expect(toISODate(c.prevFrom)).toBe("2025-12-31");
    expect(toISODate(c.prevTo)).toBe("2026-01-09");
    expect(resolvePeriod({ year: "2025" }, "UTC").mode).toBe("year");
  });
});
