"use client";

import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { calculateTaxBreakdown } from "@/lib/tax";
import type { TimeSlot } from "@/app/api/availability/route";
import type { Database, PricingType } from "@/lib/types";

type Option = Database["public"]["Tables"]["options"]["Row"];

type Props = {
  date: Date;
  slots: TimeSlot[];
  pricingType: PricingType;
  dailyPrice: number | null;
  options: Option[];
  selectedOptionIds: string[];
};

export function BookingSummary({
  date,
  slots,
  pricingType,
  dailyPrice,
  options,
  selectedOptionIds,
}: Props) {
  const ranges = getTimeRanges(slots);
  const basePrice =
    pricingType === "daily"
      ? ranges.length * (dailyPrice ?? 0)
      : slots.reduce((sum, s) => sum + s.price, 0);
  const selectedOptions = options.filter((o) =>
    selectedOptionIds.includes(o.id)
  );
  const optionsPrice = selectedOptions.reduce((sum, o) => sum + o.price, 0);
  const totalPrice = basePrice + optionsPrice;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      <h3 className="text-lg font-semibold text-zinc-900 mb-4">予約内容</h3>

      <dl className="space-y-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-zinc-500">日付</dt>
          <dd className="text-zinc-900 font-medium">
            {format(date, "yyyy年M月d日（E）", { locale: ja })}
          </dd>
        </div>

        <div>
          <dt className="text-zinc-500 mb-1">時間</dt>
          <dd className="text-zinc-900 font-medium space-y-1">
            {getTimeRanges(slots).map((range, i) => (
              <div key={i} className="flex justify-between">
                <span>{range.start} - {range.end}</span>
                <span className="text-zinc-500 font-normal">
                  {range.hours}時間
                </span>
              </div>
            ))}
            <div className="text-xs text-zinc-500 text-right">
              合計 {slots.length}時間
            </div>
          </dd>
        </div>

        <div className="flex justify-between">
          <dt className="text-zinc-500">
            {pricingType === "daily"
              ? `丸一日プラン × ${ranges.length}枠`
              : "スペース料金"}
          </dt>
          <dd className="text-zinc-900">¥{basePrice.toLocaleString()}</dd>
        </div>

        {selectedOptions.map((opt) => (
          <div key={opt.id} className="flex justify-between">
            <dt className="text-zinc-500">{opt.name}</dt>
            <dd className="text-zinc-900">¥{opt.price.toLocaleString()}</dd>
          </div>
        ))}

        <div className="border-t border-zinc-200 pt-3 flex justify-between">
          <dt className="font-semibold text-zinc-900">合計</dt>
          <dd className="font-bold text-lg text-amber-600">
            ¥{totalPrice.toLocaleString()}
          </dd>
        </div>
        {totalPrice > 0 && (
          <div className="text-right">
            <span className="text-xs text-zinc-400">
              （税抜 ¥{calculateTaxBreakdown(totalPrice).taxExcludedAmount.toLocaleString()} + 消費税 ¥{calculateTaxBreakdown(totalPrice).taxAmount.toLocaleString()}）
            </span>
          </div>
        )}
      </dl>
    </div>
  );
}

function getTimeRanges(slots: TimeSlot[]) {
  if (slots.length === 0) return [];
  const sorted = [...slots].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const ranges: { start: string; end: string; hours: number }[] = [];
  let start = sorted[0].startTime;
  let end = sorted[0].endTime;
  let hours = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].startTime === end) {
      end = sorted[i].endTime;
      hours++;
    } else {
      ranges.push({ start, end, hours });
      start = sorted[i].startTime;
      end = sorted[i].endTime;
      hours = 1;
    }
  }
  ranges.push({ start, end, hours });
  return ranges;
}
