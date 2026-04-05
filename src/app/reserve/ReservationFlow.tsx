"use client";

import { useState, useCallback } from "react";
import { format } from "date-fns";
import { DatePicker } from "@/app/_components/DatePicker";
import { TimeRangeSlider } from "@/app/_components/TimeRangeSlider";
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
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSlots = useCallback(async (date: Date) => {
    setLoading(true);
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      const res = await fetch(`/api/availability?date=${dateStr}`);
      const data: AvailabilityResponse = await res.json();
      setPricingType(data.pricingType);
      setDailyPrice(data.dailyPrice);
      setSlots(data.slots);
      setSelectedSlots([]);
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

  const handleSlotSelect = useCallback((selected: TimeSlot[]) => {
    setSelectedSlots(selected);
  }, []);

  const handleOptionToggle = useCallback((optionId: string) => {
    setSelectedOptionIds((prev) =>
      prev.includes(optionId)
        ? prev.filter((id) => id !== optionId)
        : [...prev, optionId]
    );
  }, []);

  const handleCheckout = useCallback(async () => {
    if (!selectedDate || selectedSlots.length === 0 || !guestName || !guestEmail) return;

    // 非連続選択のチェック: 連続した枠のみ許可
    const sorted = [...selectedSlots].sort((a, b) =>
      a.startTime.localeCompare(b.startTime)
    );
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].startTime !== sorted[i - 1].endTime) {
        setError("連続していない時間帯が含まれています。連続した時間帯を選択してください。");
        return;
      }
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: format(selectedDate, "yyyy-MM-dd"),
          startTime: sorted[0].startTime,
          endTime: sorted[sorted.length - 1].endTime,
          optionIds: selectedOptionIds,
          guestEmail,
          guestName,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "エラーが発生しました");
        return;
      }

      // Stripe Checkout に遷移
      window.location.href = data.url;
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  }, [selectedDate, selectedSlots, selectedOptionIds, guestName, guestEmail]);

  // daily: 選択された枠が何ブロック（連続範囲）あるか × 日額
  const selectedRangeCount =
    pricingType === "daily" && selectedSlots.length > 0
      ? countRanges(selectedSlots)
      : 0;

  const basePrice =
    pricingType === "daily"
      ? selectedRangeCount * (dailyPrice ?? 0)
      : selectedSlots.reduce((sum, s) => sum + s.price, 0);

  const totalPrice =
    basePrice +
    options
      .filter((o) => selectedOptionIds.includes(o.id))
      .reduce((sum, o) => sum + o.price, 0);

  const canProceed = selectedSlots.length > 0;

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
          <div className="space-y-4 animate-pulse">
            <div className="h-5 w-40 rounded bg-zinc-200" />
            <div className="h-4 w-64 rounded bg-zinc-200" />
            <div className="h-12 rounded-lg bg-zinc-200" />
            <div className="flex justify-center gap-4 mt-2">
              <div className="h-3 w-10 rounded bg-zinc-200" />
              <div className="h-3 w-10 rounded bg-zinc-200" />
              <div className="h-3 w-10 rounded bg-zinc-200" />
              <div className="h-3 w-10 rounded bg-zinc-200" />
            </div>
          </div>
        ) : pricingType === "daily" ? (
          /* 平日: スライダーバーでブロック選択 */
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 mb-4">
              利用時間を選択
            </h2>
            <p className="text-sm text-zinc-600 mb-4">
              {selectedRangeCount > 0
                ? `${selectedRangeCount}枠 × ¥${(dailyPrice ?? 0).toLocaleString()} = ¥${basePrice.toLocaleString()} 税込`
                : `1枠 ¥${(dailyPrice ?? 0).toLocaleString()} 税込・人数制限なし`}
            </p>
            <TimeRangeSlider
              slots={slots}
              selectedSlots={selectedSlots}
              onSelect={handleSlotSelect}
            />
          </div>
        ) : (
          /* 土日祝: 時間帯選択 */
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 mb-4">
              利用時間を選択
            </h2>
            <TimeRangeSlider
              slots={slots}
              selectedSlots={selectedSlots}
              onSelect={handleSlotSelect}
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
            disabled={!canProceed}
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

      {/* Step 4: 確認・お客様情報・決済 */}
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

        {/* お客様情報 */}
        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-5">
          <h3 className="text-base font-semibold text-zinc-900 mb-4">
            お客様情報
          </h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="guestName" className="block text-sm text-zinc-600 mb-1">
                お名前
              </label>
              <input
                id="guestName"
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="山田 太郎"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <label htmlFor="guestEmail" className="block text-sm text-zinc-600 mb-1">
                メールアドレス
              </label>
              <input
                id="guestEmail"
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="example@email.com"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-600 text-center">{error}</p>
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
            disabled={!guestName || !guestEmail || submitting}
            onClick={handleCheckout}
            className="flex-1 rounded-lg bg-amber-600 px-4 py-3 text-white font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "処理中..." : `決済に進む（¥${totalPrice.toLocaleString()}）`}
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

function countRanges(slots: TimeSlot[]): number {
  if (slots.length === 0) return 0;
  const sorted = [...slots].sort((a, b) => a.startTime.localeCompare(b.startTime));
  let count = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].startTime !== sorted[i - 1].endTime) {
      count++;
    }
  }
  return count;
}
