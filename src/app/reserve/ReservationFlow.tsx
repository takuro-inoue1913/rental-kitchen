"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { format, addDays, subDays, isBefore, startOfDay } from "date-fns";
import { ja } from "date-fns/locale";
import { countRanges, areSlotsContiguous } from "@/lib/checkout-validation";
import { DatePicker } from "@/app/_components/DatePicker";
import { TimeDropdown } from "@/app/_components/TimeDropdown";
import { OptionSelector } from "@/app/_components/OptionSelector";
import { BookingSummary } from "@/app/_components/BookingSummary";
import { LoadingButton } from "@/app/_components/LoadingButton";
import type { TimeSlot, AvailabilityResponse } from "@/app/api/availability/route";
import type { Database, PricingType } from "@/lib/types";

type Option = Database["public"]["Tables"]["options"]["Row"];

type Step = "date" | "time" | "options" | "confirm";

type UserInfo = {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
};

type Props = {
  options: Option[];
  user: UserInfo | null;
};

const STORAGE_KEY = "reservationState";

type SavedState = {
  step: Step;
  selectedDate: string;
  pricingType: PricingType;
  dailyPrice: number | null;
  slots: TimeSlot[];
  selectedSlots: TimeSlot[];
  selectedOptionIds: string[];
};

function saveState(state: SavedState) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

function loadAndClearState(): SavedState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function ReservationFlow({ options, user }: Props) {
  const [step, setStep] = useState<Step>("date");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [pricingType, setPricingType] = useState<PricingType>("hourly");
  const [dailyPrice, setDailyPrice] = useState<number | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<TimeSlot[]>([]);
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 月キャッシュ: { "2026-04-10": AvailabilityResponse, ... }
  const [monthCache, setMonthCache] = useState<
    Record<string, AvailabilityResponse>
  >({});
  const fetchedMonthsRef = useRef<Set<string>>(new Set());
  const [monthLoading, setMonthLoading] = useState(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  const fetchMonth = useCallback(async (month: Date) => {
    const monthStr = format(month, "yyyy-MM");
    if (fetchedMonthsRef.current.has(monthStr)) return;
    fetchedMonthsRef.current.add(monthStr);

    setMonthLoading(true);
    try {
      const res = await fetch(`/api/availability/month?month=${monthStr}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Record<string, AvailabilityResponse> = await res.json();
      setMonthCache((prev) => ({ ...prev, ...data }));
    } catch {
      // 失敗時はリトライ可能にする
      fetchedMonthsRef.current.delete(monthStr);
    } finally {
      setMonthLoading(false);
      setInitialLoadDone(true);
    }
  }, []);

  // マウント時に当月を先読み
  useEffect(() => {
    fetchMonth(new Date());
  }, [fetchMonth]);

  // ログイン後に予約状態を復元
  useEffect(() => {
    const saved = loadAndClearState();
    if (saved) {
      setStep(saved.step);
      setSelectedDate(new Date(saved.selectedDate));
      setPricingType(saved.pricingType);
      setDailyPrice(saved.dailyPrice);
      setSlots(saved.slots);
      setSelectedSlots(saved.selectedSlots);
      setSelectedOptionIds(saved.selectedOptionIds);
    }
  }, []);

  /** キャッシュからスロットを適用。ヒットしたら true を返す。 */
  const applyFromCache = useCallback(
    (date: Date): boolean => {
      const dateStr = format(date, "yyyy-MM-dd");
      const cached = monthCache[dateStr];
      if (!cached) return false;
      setPricingType(cached.pricingType);
      setDailyPrice(cached.dailyPrice);
      setSlots(cached.slots);
      setSelectedSlots([]);
      setLoading(false);
      return true;
    },
    [monthCache],
  );

  /** キャッシュミス時のフォールバック: 単日 API を呼ぶ */
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
      if (applyFromCache(date)) {
        setStep("time");
      } else {
        fetchSlots(date);
        setStep("time");
      }
    },
    [applyFromCache, fetchSlots],
  );

  const handleMonthChange = useCallback(
    (month: Date) => {
      fetchMonth(month);
    },
    [fetchMonth],
  );

  const today = startOfDay(new Date());

  const handlePrevDay = useCallback(() => {
    if (!selectedDate) return;
    const prev = subDays(selectedDate, 1);
    if (isBefore(prev, today)) return;
    setSelectedDate(prev);
    if (!applyFromCache(prev)) {
      fetchSlots(prev);
      // 月境界を越えた場合、新しい月も先読み
      const prevMonth = format(prev, "yyyy-MM");
      if (!fetchedMonthsRef.current.has(prevMonth)) fetchMonth(prev);
    }
  }, [selectedDate, today, applyFromCache, fetchSlots, fetchMonth]);

  const handleNextDay = useCallback(() => {
    if (!selectedDate) return;
    const next = addDays(selectedDate, 1);
    setSelectedDate(next);
    if (!applyFromCache(next)) {
      fetchSlots(next);
      const nextMonth = format(next, "yyyy-MM");
      if (!fetchedMonthsRef.current.has(nextMonth)) fetchMonth(next);
    }
  }, [selectedDate, applyFromCache, fetchSlots, fetchMonth]);

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
    if (!selectedDate || selectedSlots.length === 0 || !user) return;

    // 非連続選択のチェック: 連続した枠のみ許可
    if (!areSlotsContiguous(selectedSlots)) {
      setError("連続していない時間帯が含まれています。連続した時間帯を選択してください。");
      return;
    }
    const sorted = [...selectedSlots].sort((a, b) =>
      a.startTime.localeCompare(b.startTime)
    );

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
          guestEmail: user.email,
          guestName: user.fullName,
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
  }, [selectedDate, selectedSlots, selectedOptionIds, user]);

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
        {!initialLoadDone ? (
          <div className="flex justify-center">
            <div className="w-full max-w-sm animate-pulse">
              {/* ヘッダー（前月・月名・次月） */}
              <div className="flex items-center justify-between mb-4">
                <div className="h-9 w-16 rounded-lg bg-zinc-200" />
                <div className="h-6 w-28 rounded bg-zinc-200" />
                <div className="h-9 w-16 rounded-lg bg-zinc-200" />
              </div>
              {/* 曜日ヘッダー */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="h-4 rounded bg-zinc-200 mx-auto w-6" />
                ))}
              </div>
              {/* 日付グリッド */}
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 35 }).map((_, i) => (
                  <div key={i} className="aspect-square rounded-lg bg-zinc-100" />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <DatePicker
              selectedDate={selectedDate}
              onSelect={handleDateSelect}
              onMonthChange={handleMonthChange}
              disabled={monthLoading}
            />
          </div>
        )}
      </section>

      {/* Step 2: 時間枠選択 */}
      <section className={step === "time" ? "" : "hidden"}>
        {/* 日付ナビゲーション */}
        {selectedDate && (
          <div className="flex items-center justify-between mb-6">
            <button
              type="button"
              onClick={handlePrevDay}
              disabled={loading || isBefore(subDays(selectedDate, 1), today)}
              className="shrink-0 px-3 py-2 rounded-lg border border-zinc-300 bg-white text-zinc-700 text-sm font-medium shadow-sm hover:bg-zinc-50 hover:border-zinc-400 active:bg-zinc-100 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-zinc-300 transition-colors"
            >
              &lt; 前日
            </button>
            <span className="text-base sm:text-xl font-bold text-zinc-900 text-center truncate px-2">
              {format(selectedDate, "yyyy年M月d日（E）", { locale: ja })}
            </span>
            <button
              type="button"
              onClick={handleNextDay}
              disabled={loading}
              className="shrink-0 px-3 py-2 rounded-lg border border-zinc-300 bg-white text-zinc-700 text-sm font-medium shadow-sm hover:bg-zinc-50 hover:border-zinc-400 active:bg-zinc-100 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-zinc-300 transition-colors"
            >
              次日 &gt;
            </button>
          </div>
        )}

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
        ) : (
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 mb-4">
              利用時間を選択
            </h2>
            {pricingType === "daily" && (
              <p className="text-sm text-zinc-600 mb-4">
                {selectedRangeCount > 0
                  ? `${selectedRangeCount}枠 × ¥${(dailyPrice ?? 0).toLocaleString()} = ¥${basePrice.toLocaleString()} 税込`
                  : `1枠 ¥${(dailyPrice ?? 0).toLocaleString()} 税込・人数制限なし`}
              </p>
            )}
            <TimeDropdown
              slots={slots}
              selectedSlots={selectedSlots}
              onSelect={handleSlotSelect}
            />
          </div>
        )}
        <div className="flex gap-3 mt-6">
          <LoadingButton variant="outline" onClick={() => {
            setSelectedDate(null);
            setSelectedSlots([]);
            setStep("date");
          }}>
            戻る
          </LoadingButton>
          <LoadingButton
            loading={loading}
            disabled={!canProceed}
            onClick={() => setStep("options")}
          >
            次へ
          </LoadingButton>
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
          <LoadingButton variant="outline" onClick={() => setStep("time")}>
            戻る
          </LoadingButton>
          <LoadingButton onClick={() => setStep("confirm")}>
            確認へ
          </LoadingButton>
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

        {/* お客様情報（ログイン済みユーザー情報を表示） */}
        {user && (
          <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-5">
            <h3 className="text-base font-semibold text-zinc-900 mb-3">
              お客様情報
            </h3>
            <dl className="space-y-2 text-sm">
              <div className="flex gap-3">
                <dt className="text-zinc-500 shrink-0">お名前</dt>
                <dd className="text-zinc-900">{user.fullName}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="text-zinc-500 shrink-0">メール</dt>
                <dd className="text-zinc-900">{user.email}</dd>
              </div>
            </dl>
          </div>
        )}

        {error && (
          <p className="mt-4 text-sm text-red-600 text-center">{error}</p>
        )}

        <div className="flex gap-3 mt-6">
          <LoadingButton variant="outline" onClick={() => setStep("options")}>
            戻る
          </LoadingButton>
          {user ? (
            <LoadingButton
              loading={submitting}
              onClick={handleCheckout}
              className="flex-1 py-3"
            >
              {`決済に進む（¥${totalPrice.toLocaleString()}）`}
            </LoadingButton>
          ) : (
            <LoadingButton
              onClick={() => {
                if (selectedDate) {
                  saveState({
                    step: "confirm",
                    selectedDate: selectedDate.toISOString(),
                    pricingType,
                    dailyPrice,
                    slots,
                    selectedSlots,
                    selectedOptionIds,
                  });
                }
                window.location.href = "/auth/login?redirect=/reserve";
              }}
              className="flex-1 py-3"
            >
              ログインして決済に進む
            </LoadingButton>
          )}
        </div>
        <p className="text-xs text-zinc-500 text-center mt-3">
          {user
            ? "※ 決済は Stripe の安全な決済画面で行われます"
            : "※ 決済にはログインまたは新規登録が必要です"}
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

