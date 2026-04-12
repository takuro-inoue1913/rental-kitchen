const TAX_RATE = 0.1;

export type TaxBreakdown = {
  taxIncludedTotal: number;
  taxExcludedAmount: number;
  taxAmount: number;
  taxRate: number;
};

/**
 * 税込価格から税抜額・消費税額を逆算する。
 * 整数演算で浮動小数点誤差を回避: 税抜 = floor(税込 × 10 / 11)
 * 税額 = 税込 - 税抜
 */
export function calculateTaxBreakdown(
  taxIncludedTotal: number
): TaxBreakdown {
  const taxExcludedAmount = Math.floor((taxIncludedTotal * 10) / 11);
  const taxAmount = taxIncludedTotal - taxExcludedAmount;
  return {
    taxIncludedTotal,
    taxExcludedAmount,
    taxAmount,
    taxRate: TAX_RATE,
  };
}
