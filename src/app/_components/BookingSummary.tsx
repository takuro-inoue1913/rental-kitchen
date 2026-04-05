"use client";

import { format } from "date-fns";
import { ja } from "date-fns/locale";
import type { TimeSlot } from "@/app/api/availability/route";
import type { Database } from "@/lib/types";

type Option = Database["public"]["Tables"]["options"]["Row"];

type Props = {
  date: Date;
  slots: TimeSlot[];
  options: Option[];
  selectedOptionIds: string[];
};

export function BookingSummary({
  date,
  slots,
  options,
  selectedOptionIds,
}: Props) {
  const basePrice = slots.reduce((sum, s) => sum + s.price, 0);
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

        <div className="flex justify-between">
          <dt className="text-zinc-500">時間</dt>
          <dd className="text-zinc-900 font-medium">
            {slots[0].startTime} - {slots[slots.length - 1].endTime}
            <span className="text-zinc-500 font-normal ml-1">
              ({slots.length}時間)
            </span>
          </dd>
        </div>

        <div className="flex justify-between">
          <dt className="text-zinc-500">スペース料金</dt>
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
      </dl>
    </div>
  );
}
