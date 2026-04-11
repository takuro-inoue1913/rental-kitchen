"use client";

import { useState } from "react";
import type { TimeSlot } from "@/app/api/availability/route";
import type { PricingType } from "@/lib/types";

type Props = {
  slots: TimeSlot[];
  selectedSlots: TimeSlot[];
  onSelect: (selected: TimeSlot[]) => void;
  pricingType: PricingType;
};

function parseTime(time: string): { hour: string; minute: string } {
  const [h, m] = time.split(":");
  return { hour: h, minute: m ?? "00" };
}

function formatTime(hour: string, minute: string): string {
  return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
}

/**
 * 開始時間・終了時間をドロップダウン + タイムラインバーで選択するコンポーネント。
 * daily の場合は複数枠を追加可能。
 */
export function TimeDropdown({
  slots,
  selectedSlots,
  onSelect,
  pricingType,
}: Props) {
  const [addingNew, setAddingNew] = useState(false);
  const availableSlots = slots.filter((s) => s.available);

  // 選択中の範囲一覧を算出
  const ranges = getRanges(selectedSlots);
  const lastRangeIdx = ranges.length - 1;

  // addingNew: 全範囲を確定済みとして扱い、ドロップダウンを空にする
  const currentStart =
    !addingNew && ranges.length > 0 ? ranges[lastRangeIdx].start : "";
  const currentEnd =
    !addingNew && ranges.length > 0 ? ranges[lastRangeIdx].end : "";

  // addingNew の場合は全スロットが確定済み、そうでなければ最後の範囲を除く
  const confirmedSlots = addingNew
    ? [...selectedSlots]
    : selectedSlots.filter((s) => {
        if (lastRangeIdx < 0) return false;
        const lastRange = ranges[lastRangeIdx];
        return s.startTime < lastRange.start || s.startTime >= lastRange.end;
      });
  const occupiedSet = new Set(confirmedSlots.map((s) => s.startTime));

  // 開始時間の選択肢: 空き枠 かつ 確定済み範囲と重複しない
  const startOptions = availableSlots
    .filter((s) => !occupiedSet.has(s.startTime))
    .map((s) => s.startTime);

  // 終了時間の選択肢: 選択した開始時間から連続する空き枠の endTime
  const endOptions: string[] = [];
  if (currentStart) {
    const startIdx = slots.findIndex((s) => s.startTime === currentStart);
    if (startIdx !== -1) {
      for (let i = startIdx; i < slots.length; i++) {
        if (!slots[i].available || occupiedSet.has(slots[i].startTime)) {
          break;
        }
        endOptions.push(slots[i].endTime);
      }
    }
  }

  function handleStartChange(startTime: string) {
    if (!startTime) {
      onSelect(confirmedSlots);
      return;
    }
    const slot = slots.find((s) => s.startTime === startTime);
    if (slot) {
      setAddingNew(false);
      onSelect([...confirmedSlots, slot]);
    }
  }

  function handleEndChange(endTime: string) {
    if (!currentStart || !endTime) return;
    const startIdx = slots.findIndex((s) => s.startTime === currentStart);
    const endIdx = slots.findIndex((s) => s.endTime === endTime);
    if (startIdx === -1 || endIdx === -1) return;

    const newRange = slots.slice(startIdx, endIdx + 1);
    onSelect([...confirmedSlots, ...newRange]);
  }

  function handleStartHourChange(hour: string) {
    const { minute } = currentStart ? parseTime(currentStart) : { minute: "00" };
    handleStartChange(formatTime(hour, minute));
  }

  function handleStartMinuteChange(minute: string) {
    if (!currentStart) return;
    const { hour } = parseTime(currentStart);
    handleStartChange(formatTime(hour, minute));
  }

  function handleEndHourChange(hour: string) {
    const { minute } = currentEnd ? parseTime(currentEnd) : { minute: "00" };
    handleEndChange(formatTime(hour, minute));
  }

  function handleEndMinuteChange(minute: string) {
    if (!currentEnd) return;
    const { hour } = parseTime(currentEnd);
    handleEndChange(formatTime(hour, minute));
  }

  function handleAddRange() {
    if (!hasRemainingSlots) return;
    setAddingNew(true);
  }

  function handleRemoveRange(rangeIdx: number) {
    const range = ranges[rangeIdx];
    const remaining = selectedSlots.filter(
      (s) => s.startTime < range.start || s.startTime >= range.end,
    );
    setAddingNew(false);
    onSelect(remaining);
  }

  // ドロップダウン用の時間・分選択肢
  const startHours = [...new Set(startOptions.map((t) => parseTime(t).hour))];
  const startMinutes = currentStart
    ? startOptions
        .filter((t) => parseTime(t).hour === parseTime(currentStart).hour)
        .map((t) => parseTime(t).minute)
    : [];
  const endHours = [...new Set(endOptions.map((t) => parseTime(t).hour))];
  const endMinutes = currentEnd
    ? endOptions
        .filter((t) => parseTime(t).hour === parseTime(currentEnd).hour)
        .map((t) => parseTime(t).minute)
    : [];

  const totalHours = selectedSlots.length;

  // タイムラインバー用
  const lastSlotTime =
    slots.length > 0 ? slots[slots.length - 1].endTime : "24:00";
  const selectedSet = new Set(selectedSlots.map((s) => s.startTime));

  // 枠追加ボタンの disabled 判定: 全選択済みスロットを含めて空きがあるか
  const hasRemainingSlots =
    availableSlots.filter((s) => !selectedSet.has(s.startTime)).length > 0;

  if (slots.length === 0) {
    return (
      <p className="text-zinc-500 text-sm">
        この日は予約可能な枠がありません。
      </p>
    );
  }

  if (availableSlots.length === 0) {
    return (
      <p className="text-sm text-red-500 text-center">
        この日は全枠が予約済みです
      </p>
    );
  }

  const selectClass =
    "rounded-lg border border-zinc-300 px-2 py-2 text-sm text-zinc-900 bg-white focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer";

  const confirmedRanges = addingNew ? ranges : ranges.slice(0, -1);
  const disabledSelectClass =
    "rounded-lg border border-zinc-200 px-2 py-2 text-sm text-zinc-400 bg-zinc-50";

  return (
    <div className="space-y-5">
      {/* 確定済みの範囲一覧（disabled なドロップダウン風 UI） */}
      {pricingType === "daily" &&
        confirmedRanges.map((range, i) => (
          <div key={range.start} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">枠 {i + 1}</span>
              <button
                type="button"
                onClick={() => handleRemoveRange(i)}
                className="px-3 py-1 text-xs rounded-lg border border-red-200 text-red-500 hover:bg-red-50 hover:text-red-700 cursor-pointer transition-colors"
              >
                削除
              </button>
            </div>
            <div className="flex items-end justify-center gap-1">
              <div className="flex items-center gap-0.5">
                <div className={disabledSelectClass}>
                  {parseTime(range.start).hour}
                </div>
                <span className="text-zinc-300 font-medium">:</span>
                <div className={disabledSelectClass}>
                  {parseTime(range.start).minute}
                </div>
              </div>
              <span className="text-zinc-300 text-lg pb-0.5 px-2">〜</span>
              <div className="flex items-center gap-0.5">
                <div className={disabledSelectClass}>
                  {parseTime(range.end).hour}
                </div>
                <span className="text-zinc-300 font-medium">:</span>
                <div className={disabledSelectClass}>
                  {parseTime(range.end).minute}
                </div>
              </div>
            </div>
          </div>
        ))}

      {/* アクティブな枠ドロップダウン（addingNew で選択肢がない場合は非表示） */}
      {!(addingNew && startOptions.length === 0) && <div>
        {pricingType === "daily" && confirmedRanges.length > 0 && (
          <span className="block text-xs text-zinc-500 mb-1">
            枠 {confirmedRanges.length + 1}
          </span>
        )}
        <div className="flex items-end justify-center gap-1 flex-wrap">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">開始</label>
            <div className="flex items-center gap-0.5">
              <select
                value={currentStart ? parseTime(currentStart).hour : ""}
                onChange={(e) => handleStartHourChange(e.target.value)}
                className={selectClass}
              >
                <option value="">--</option>
                {startHours.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
              <span className="text-zinc-500 font-medium">:</span>
              <select
                value={currentStart ? parseTime(currentStart).minute : ""}
                onChange={(e) => handleStartMinuteChange(e.target.value)}
                disabled={!currentStart}
                className={`${selectClass} disabled:opacity-50`}
              >
                <option value="">--</option>
                {startMinutes.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <span className="text-zinc-400 text-lg pb-2 px-2">〜</span>

          <div>
            <label className="block text-xs text-zinc-500 mb-1">終了</label>
            <div className="flex items-center gap-0.5">
              <select
                value={currentEnd ? parseTime(currentEnd).hour : ""}
                onChange={(e) => handleEndHourChange(e.target.value)}
                disabled={!currentStart}
                className={`${selectClass} disabled:opacity-50`}
              >
                <option value="">--</option>
                {endHours.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
              <span className="text-zinc-500 font-medium">:</span>
              <select
                value={currentEnd ? parseTime(currentEnd).minute : ""}
                onChange={(e) => handleEndMinuteChange(e.target.value)}
                disabled={!currentEnd}
                className={`${selectClass} disabled:opacity-50`}
              >
                <option value="">--</option>
                {endMinutes.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>}

      {/* 日単位: 枠を追加ボタン（タイムラインバーの上） */}
      {pricingType === "daily" && selectedSlots.length > 0 && !addingNew && (
        <button
          type="button"
          onClick={handleAddRange}
          disabled={!hasRemainingSlots}
          className="w-full rounded-lg border border-dashed border-amber-300 px-4 py-2 text-sm text-amber-600 hover:bg-amber-50 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        >
          + 枠を追加
        </button>
      )}

      {/* タイムラインバー */}
      <div>
        <div className="relative h-8 rounded-lg overflow-hidden border border-zinc-200">
          <div className="flex h-full">
            {slots.map((slot) => {
              const isSelected = selectedSet.has(slot.startTime);
              const isAvailable = slot.available;

              let bgClass: string;
              if (!isAvailable) {
                bgClass = "bg-zinc-200";
              } else if (isSelected) {
                bgClass = "bg-amber-500";
              } else {
                bgClass = "bg-white";
              }

              return (
                <div
                  key={slot.startTime}
                  className={`flex-1 border-r border-zinc-100 ${bgClass}`}
                  title={`${slot.startTime}-${slot.endTime}${!isAvailable ? "（予約済み）" : ""}`}
                />
              );
            })}
          </div>
        </div>
        <div className="relative h-4 mt-1">
          {slots
            .filter((_, i) => i % Math.max(1, Math.floor(slots.length / 6)) === 0)
            .map((slot) => {
              const idx = slots.indexOf(slot);
              return (
                <span
                  key={slot.startTime}
                  className="absolute text-[10px] text-zinc-400 -translate-x-1/2"
                  style={{ left: `${(idx / slots.length) * 100}%` }}
                >
                  {slot.startTime.replace(/^0/, "")}
                </span>
              );
            })}
          <span
            className="absolute text-[10px] text-zinc-400 right-0 translate-x-1/2"
          >
            {lastSlotTime.replace(/^0/, "")}
          </span>
        </div>
      </div>

      {/* 選択サマリ */}
      {totalHours > 0 && (
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-4 py-1.5 text-sm font-medium text-white">
            {totalHours}時間選択中
          </span>
        </div>
      )}
    </div>
  );
}

type Range = { start: string; end: string; hours: number };

function getRanges(selectedSlots: TimeSlot[]): Range[] {
  if (selectedSlots.length === 0) return [];
  const sorted = [...selectedSlots].sort((a, b) =>
    a.startTime.localeCompare(b.startTime),
  );
  const ranges: Range[] = [];
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
