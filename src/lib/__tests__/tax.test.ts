import { describe, it, expect } from "vitest";
import { calculateTaxBreakdown } from "../tax";

describe("calculateTaxBreakdown", () => {
  it("¥11,000 → 税抜 ¥10,000 + 税 ¥1,000", () => {
    const result = calculateTaxBreakdown(11000);
    expect(result.taxExcludedAmount).toBe(10000);
    expect(result.taxAmount).toBe(1000);
    expect(result.taxIncludedTotal).toBe(11000);
    expect(result.taxRate).toBe(0.1);
  });

  it("¥2,500 → floor(2500/1.1)=2272, 税=228", () => {
    const result = calculateTaxBreakdown(2500);
    expect(result.taxExcludedAmount).toBe(2272);
    expect(result.taxAmount).toBe(228);
  });

  it("¥0 → すべて0", () => {
    const result = calculateTaxBreakdown(0);
    expect(result.taxExcludedAmount).toBe(0);
    expect(result.taxAmount).toBe(0);
  });

  it("¥1 → 税抜0, 税1", () => {
    const result = calculateTaxBreakdown(1);
    expect(result.taxExcludedAmount).toBe(0);
    expect(result.taxAmount).toBe(1);
  });

  it("大きな金額 ¥110,000 → 税抜 ¥100,000 + 税 ¥10,000", () => {
    const result = calculateTaxBreakdown(110000);
    expect(result.taxExcludedAmount).toBe(100000);
    expect(result.taxAmount).toBe(10000);
  });

  it("税抜 + 税額 = 税込合計が常に成り立つ", () => {
    const prices = [100, 550, 1100, 3300, 5500, 7700, 11000, 25000, 99999];
    for (const price of prices) {
      const result = calculateTaxBreakdown(price);
      expect(result.taxExcludedAmount + result.taxAmount).toBe(price);
    }
  });
});
