"use client";

import { useState, useCallback } from "react";
import { format } from "date-fns";
import { DatePicker } from "@/app/_components/DatePicker";
import { TimeSlotGrid } from "@/app/_components/TimeSlotGrid";
import { OptionSelector } from "@/app/_components/OptionSelector";
import { BookingSummary } from "@/app/_components/BookingSummary";
import type { TimeSlot, AvailabilityResponse } from "@/app/api/availability/route";
import type { Database, PricingType } from "@/lib/types";

type Option = Database["public"]["Tables"]["options"]["Row"];

type Step = "date" | "time" | "options" | "confirm";

type Props = {
  options: Option[];
};

export function ReservationFlow({ options }: Props) {
  const [step, setStep] = useState<Step>("date");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [pricingType, setPricingType] = useState<PricingType>("hourly");
  const [dailyPrice, setDailyPrice] = useState<number | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<TimeSlot[]>([]);
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSlots = useCallback(async (date: Date) => {
    setLoading(true);
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      const res = await fetch(`/api/availability?date=${dateStr}`);
      const data: AvailabilityResponse = await res.json();
      setPricingType(data.pricingType);
      setDailyPrice(data.dailyPrice);
      setSlots(data.slots);

      // daily の場合は自動的に全枠を選択
      if (data.pricingType === "daily" && data.slots.length > 0) {
        const availableSlots = data.slots.filter((s) => s.available);
        setSelectedSlots(availableSlots);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDateSelect = useCallback(
    (date: Date) => {
      setSelectedDate(date);
      setSelectedSlots([]);
      fetchSlots(date);
      setStep("time");
    },
    [fetchSlots]
  );

  const handleSlotToggle = useCallback((slot: TimeSlot) => {
    setSelectedSlots((prev) => {
      const exists = prev.some(
        (s) => s.startTime === slot.startTime && s.endTime === slot.endTime
      );
      if (exists) {
        return prev.filter(
          (s) => !(s.startTime === slot.startTime && s.endTime === slot.endTime)
        );
      }
      return [...prev, slot].sort((a, b) =>
        a.startTime.localeCompare(b.startTime)
      );
    });
  }, []);

  const handleOptionToggle = useCallback((optionId: string) => {
    setSelectedOptionIds((prev) =>
      prev.includes(optionId)
        ? prev.filter((id) => id !== optionId)
        : [...prev, optionId]
    );
  }, []);

  const basePrice =
    pricingType === "daily"
      ? (dailyPrice ?? 0)
      : selectedSlots.reduce((sum, s) => sum + s.price, 0);

  const totalPrice =
    basePrice +
    options
      .filter((o) => selectedOptionIds.includes(o.id))
      .reduce((sum, o) => sum + o.price, 0);

  const isDayAvailable =
    pricingType === "daily" && slots.length > 0 && slots[0].available;
  const isDayBooked =
    pricingType === "daily" && slots.length > 0 && !slots[0].available;

  return (
    <div className="space-y-8">
      {/* ステップインジケーター */}
      <StepIndicator current={step} />

      {/* Step 1: 日付選択 */}
      <section className={step === "date" ? "" : "hidden"}>
        <h2 className="text-lg font-semibold text-zinc-900 mb-4">
          日付を選択
        </h2>
        <div className="flex justify-center">
          <DatePicker
            selectedDate={selectedDate}
            onSelect={handleDateSelect}
          />
        </div>
      </section>

      {/* Step 2: 時間枠選択 */}
      <section className={step === "time" ? "" : "hidden"}>
        {loading ? (
          <p className="text-zinc-500 text-sm">読み込み中...</p>
        ) : pricingType === "daily" ? (
          /* 平日: 丸一日プラン */
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 mb-4">
              丸一日プラン
            </h2>
            {isDayBooked ? (
              <div className="rounded-lg border border-zinc-200 bg-zinc-100 p-6 text-center">
                <p className="text-zinc-500">この日は予約済みです</p>
              </div>
            ) : isDayAvailable ? (
              <div className="rounded-lg border-2 border-amber-600 bg-amber-50 p-6 text-center">
                <p className="text-lg font-semibold text-zinc-900">
                  {slots[0].startTime} - {slots[0].endTime}
                </p>
                <p className="text-2xl font-bold text-amber-600 mt-2">
                  ¥{(dailyPrice ?? 0).toLocaleString()}
                  <span className="text-sm font-normal text-zinc-500 ml-1">
                    /日（税込）
                  </span>
                </p>
                <p className="text-xs text-zinc-500 mt-1">人数制限なし</p>
              </div>
            ) : (
              <p className="text-zinc-500 text-sm">
                この日は予約できません。
              </p>
            )}
          </div>
        ) : (
          /* 土日祝: 時間枠選択 */
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 mb-4">
              時間枠を選択
            </h2>
            <TimeSlotGrid
              slots={slots}
              selectedSlots={selectedSlots}
              onToggle={handleSlotToggle}
            />
          </div>
        )}
        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={() => setStep("date")}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            戻る
          </button>
          <button
            type="button"
            disabled={
              pricingType === "daily" ? !isDayAvailable : selectedSlots.length === 0
            }
            onClick={() => setStep("options")}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm text-white font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            次へ
          </button>
        </div>
      </section>

      {/* Step 3: オプション選択 */}
      <section className={step === "options" ? "" : "hidden"}>
        <h2 className="text-lg font-semibold text-zinc-900 mb-4">
          オプション
        </h2>
        {options.length > 0 ? (
          <OptionSelector
            options={options}
            selectedIds={selectedOptionIds}
            onToggle={handleOptionToggle}
          />
        ) : (
          <p className="text-zinc-500 text-sm">
            現在利用可能なオプションはありません。
          </p>
        )}
        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={() => setStep("time")}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            戻る
          </button>
          <button
            type="button"
            onClick={() => setStep("confirm")}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm text-white font-medium hover:bg-amber-700"
          >
            確認へ
          </button>
        </div>
      </section>

      {/* Step 4: 確認 */}
      <section className={step === "confirm" ? "" : "hidden"}>
        <h2 className="text-lg font-semibold text-zinc-900 mb-4">
          予約内容の確認
        </h2>
        {selectedDate && selectedSlots.length > 0 && (
          <BookingSummary
            date={selectedDate}
            slots={selectedSlots}
            pricingType={pricingType}
            dailyPrice={dailyPrice}
            options={options}
            selectedOptionIds={selectedOptionIds}
          />
        )}
        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={() => setStep("options")}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            戻る
          </button>
          <button
            type="button"
            className="flex-1 rounded-lg bg-amber-600 px-4 py-3 text-white font-medium hover:bg-amber-700"
          >
            決済に進む（¥{totalPrice.toLocaleString()}）
          </button>
        </div>
        <p className="text-xs text-zinc-500 text-center mt-3">
          ※ 決済は Stripe の安全な決済画面で行われます
        </p>
      </section>
    </div>
  );
}

const STEPS: { key: Step; label: string }[] = [
  { key: "date", label: "日付" },
  { key: "time", label: "時間" },
  { key: "options", label: "オプション" },
  { key: "confirm", label: "確認" },
];

function StepIndicator({ current }: { current: Step }) {
  const currentIndex = STEPS.findIndex((s) => s.key === current);

  return (
    <div className="flex items-center justify-center gap-2">
      {STEPS.map((s, i) => (
        <div key={s.key} className="flex items-center gap-2">
          <div
            className={`
              flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium
              ${i <= currentIndex ? "bg-amber-600 text-white" : "bg-zinc-200 text-zinc-500"}
            `}
          >
            {i + 1}
          </div>
          <span
            className={`text-xs ${i <= currentIndex ? "text-amber-600 font-medium" : "text-zinc-400"}`}
          >
            {s.label}
          </span>
          {i < STEPS.length - 1 && (
            <div
              className={`h-px w-6 ${i < currentIndex ? "bg-amber-600" : "bg-zinc-200"}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
