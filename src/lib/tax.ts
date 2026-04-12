/** 消費税率 10% — 分子/分母で整数演算に使用 */
const TAX_RATE_NUMERATOR = 10;
const TAX_RATE_DENOMINATOR = TAX_RATE_NUMERATOR + 100; // 110

export type TaxBreakdown = {
  taxIncludedTotal: number;
  taxExcludedAmount: number;
  taxAmount: number;
  taxRate: number;
};

/**
 * 税込価格から税抜額・消費税額を逆算する。
 * 整数演算で浮動小数点誤差を回避:
 *   税抜 = floor(税込 × 100 / 110)
 *   税額 = 税込 - 税抜
 */
export function calculateTaxBreakdown(
  taxIncludedTotal: number
): TaxBreakdown {
  const taxExcludedAmount = Math.floor(
    (taxIncludedTotal * (TAX_RATE_DENOMINATOR - TAX_RATE_NUMERATOR)) / TAX_RATE_DENOMINATOR
  );
  const taxAmount = taxIncludedTotal - taxExcludedAmount;
  return {
    taxIncludedTotal,
    taxExcludedAmount,
    taxAmount,
    taxRate: TAX_RATE_NUMERATOR / 100,
  };
}
